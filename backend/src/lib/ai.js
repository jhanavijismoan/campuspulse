// Calls a locally-running Ollama model (https://ollama.com) to generate
// structured JSON output. No API key needed — Ollama runs entirely on your
// own machine. Both CV Builder and internship matching use this same helper,
// so swapping models or pointing at a different Ollama host only needs a
// change here (or in .env).

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

function isOllamaConfigured() {
  return Boolean(process.env.OLLAMA_MODEL);
}

// Sends `prompt` to Ollama with format:'json', which makes Ollama guarantee
// syntactically valid JSON back — the prompt itself still needs to describe
// the exact shape you want (object vs array, field names, etc).
async function generateJSON(prompt) {
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw new Error('OLLAMA_MODEL is not set in .env');

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, format: 'json', stream: false }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${text}. Is the Ollama app running?`);
  }

  const data = await res.json();
  const raw = (data.response || '').trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { isOllamaConfigured, generateJSON };
