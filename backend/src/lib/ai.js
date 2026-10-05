// Provider-agnostic AI layer for CampusPulse.
// Auto-detects provider from env: GROQ_API_KEY -> groq, GEMINI_API_KEY -> gemini,
// OLLAMA_MODEL -> ollama, else none.
// Override by setting AI_PROVIDER = groq | gemini | ollama | none.
//
// IMPORTANT: Free model names change often. Verify current names at:
//   Groq:   https://console.groq.com/docs/models
//   Gemini: https://ai.google.dev/gemini-api/docs/models

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Default model names — override via env
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

function getProvider() {
  const explicit = process.env.AI_PROVIDER;
  if (explicit) return explicit;
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OLLAMA_MODEL) return 'ollama';
  return 'none';
}

function isAiConfigured() {
  return getProvider() !== 'none';
}

// Backward-compat alias used by cv.js and matching.js
function isOllamaConfigured() {
  return isAiConfigured();
}

// Normalized error with .code and .status
function makeError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

async function fetchWithTimeout(url, opts, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function retryFetch(url, opts, timeoutMs = 20000) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs);
      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 800));
        lastErr = res;
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastErr instanceof Error ? lastErr : makeError('Network error', 'NETWORK_ERROR', 0);
}

// Strip code fences that some models add even in JSON mode
function parseJSONSafe(raw) {
  const cleaned = (raw || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

// ── Groq (OpenAI-compatible) ─────────────────────────────────────────────────

async function groqChat({ system, messages, tools, maxTokens = 1024, temperature = 0.3 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw makeError('GROQ_API_KEY not set', 'AI_NOT_CONFIGURED', 0);

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content ?? m.text })),
    ],
  };
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    body.tool_choice = 'auto';
  }

  const res = await retryFetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Groq error ${res.status}: ${txt}`, 'PROVIDER_ERROR', res.status);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;
  const text = msg?.content || '';
  const toolCalls = (msg?.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || '{}'),
  }));
  return { text, toolCalls };
}

async function groqGenerateJSON(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw makeError('GROQ_API_KEY not set', 'AI_NOT_CONFIGURED', 0);
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const res = await retryFetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Groq error ${res.status}: ${txt}`, 'PROVIDER_ERROR', res.status);
  }
  const data = await res.json();
  return parseJSONSafe(data.choices?.[0]?.message?.content || '{}');
}

// ── Gemini ────────────────────────────────────────────────────────────────────

function toGeminiContents(system, messages) {
  const contents = [];
  // Gemini doesn't have a system role in contents; inject as first user turn if present
  if (system) {
    contents.push({ role: 'user', parts: [{ text: `[System instructions]\n${system}` }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  for (const m of messages) {
    const role = m.role === 'ai' || m.role === 'assistant' ? 'model' : 'user';
    const text = m.content ?? m.text ?? '';
    if (m.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: m.name, response: { content: text } } }],
      });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  return contents;
}

async function geminiChat({ system, messages, tools, maxTokens = 1024, temperature = 0.3 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw makeError('GEMINI_API_KEY not set', 'AI_NOT_CONFIGURED', 0);
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const body = {
    contents: toGeminiContents(system, messages),
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  if (tools && tools.length) {
    body.tools = [{
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    }];
  }

  const res = await retryFetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Gemini error ${res.status}: ${txt}`, 'PROVIDER_ERROR', res.status);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let text = '';
  const toolCalls = [];
  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      toolCalls.push({ id: part.functionCall.name, name: part.functionCall.name, args: part.functionCall.args || {} });
    }
  }
  return { text, toolCalls };
}

async function geminiGenerateJSON(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw makeError('GEMINI_API_KEY not set', 'AI_NOT_CONFIGURED', 0);
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const res = await retryFetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Gemini error ${res.status}: ${txt}`, 'PROVIDER_ERROR', res.status);
  }
  const data = await res.json();
  return parseJSONSafe(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
}

// ── Ollama ────────────────────────────────────────────────────────────────────

async function ollamaChat({ system, messages, tools, maxTokens = 1024, temperature = 0.3 }) {
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw makeError('OLLAMA_MODEL not set', 'AI_NOT_CONFIGURED', 0);

  const ollamaMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : m.role,
      content: m.content ?? m.text ?? '',
    })),
  ];

  const body = { model, messages: ollamaMessages, stream: false, options: { temperature, num_predict: maxTokens } };
  if (tools && tools.length) body.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

  const res = await retryFetch(`${OLLAMA_BASE_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Ollama error ${res.status}: ${txt}`, 'PROVIDER_ERROR', res.status);
  }
  const data = await res.json();
  const msg = data.message || {};
  const text = msg.content || '';
  const toolCalls = (msg.tool_calls || []).map((tc) => ({
    id: tc.function?.name || '',
    name: tc.function?.name || '',
    args: tc.function?.arguments || {},
  }));
  return { text, toolCalls };
}

async function ollamaGenerateJSON(prompt) {
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw makeError('OLLAMA_MODEL not set', 'AI_NOT_CONFIGURED', 0);

  const res = await retryFetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, format: 'json', stream: false }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw makeError(`Ollama error ${res.status}: ${txt}. Is Ollama running?`, 'PROVIDER_ERROR', res.status);
  }
  const data = await res.json();
  return parseJSONSafe(data.response || '{}');
}

// ── Public API ────────────────────────────────────────────────────────────────

async function chat(opts) {
  const provider = getProvider();
  if (provider === 'groq') return groqChat(opts);
  if (provider === 'gemini') return geminiChat(opts);
  if (provider === 'ollama') return ollamaChat(opts);
  throw makeError('No AI provider configured', 'AI_NOT_CONFIGURED', 0);
}

async function generateJSON(prompt) {
  const provider = getProvider();
  if (provider === 'groq') return groqGenerateJSON(prompt);
  if (provider === 'gemini') return geminiGenerateJSON(prompt);
  if (provider === 'ollama') return ollamaGenerateJSON(prompt);
  throw makeError('No AI provider configured', 'AI_NOT_CONFIGURED', 0);
}

module.exports = { getProvider, isAiConfigured, isOllamaConfigured, generateJSON, chat };
