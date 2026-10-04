const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SUGGESTED_PROMPTS = [
  'When is my next CIA?',
  'What assignments are due this week?',
  'What do I need to print for my CIA?',
  'Where do I submit the Blue Book?',
  'Are there any internships suitable for me?',
];

const ADMIN_SUGGESTED_PROMPTS = [
  "Which students haven't submitted the assignment?",
  'Draft a reminder for my BBA students',
  'Summarize the questions students asked this week',
  'Create a 10-question quiz on Central Banking and RBI',
  'Create an announcement for the Council Meeting',
  'Which students need a reminder about Blue Books?',
];

router.get('/suggestions', requireAuth, (req, res) => {
  res.json(req.user.role === 'admin' ? ADMIN_SUGGESTED_PROMPTS : SUGGESTED_PROMPTS);
});

/**
 * Mocked Pulse AI. Answers a small set of intents by querying the real
 * database (so answers are actually correct for this user), and falls
 * back to a generic response otherwise. Swap `answerFromRules` for a
 * real Claude API call when you're ready to wire up live AI - keep the
 * same request/response contract.
 */
async function answerFromRules(message, userId) {
  const lower = message.toLowerCase();

  if (lower.includes('cia')) {
    const { rows } = await pool.query(
      `SELECT title, starts_at, location FROM events
       WHERE user_id = $1 AND event_type = 'exam' AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT 1`,
      [userId]
    );
    if (rows[0]) {
      const date = new Date(rows[0].starts_at).toLocaleString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
      });
      return `Your next CIA is "${rows[0].title}" on ${date}${rows[0].location ? ` in ${rows[0].location}` : ''}. Don't forget to check your seating plan beforehand.`;
    }
    return "You don't have any upcoming CIA exams scheduled right now.";
  }

  if (lower.includes('assignment') || lower.includes('due')) {
    const { rows } = await pool.query(
      `SELECT title, starts_at FROM events
       WHERE user_id = $1 AND event_type = 'assignment' AND starts_at >= now()
       ORDER BY starts_at ASC LIMIT 5`,
      [userId]
    );
    if (!rows.length) return "You're all caught up - no assignments due soon!";
    const list = rows.map(r => `- ${r.title} (${new Date(r.starts_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})`).join('\n');
    return `Here's what's due soon:\n${list}`;
  }

  if (lower.includes('blue book')) {
    return 'The Blue Book should be submitted at the examination cell before the end of day on the date shown in your calendar. Check Documents & Forms for the "Blue Book Guidelines" for the exact format.';
  }

  if (lower.includes('internship')) {
    const { rows } = await pool.query(
      `SELECT i.company_name, i.role_title, ia.match_score FROM internships i
       JOIN internship_applications ia ON ia.internship_id = i.id
       WHERE ia.user_id = $1 ORDER BY ia.match_score DESC LIMIT 3`,
      [userId]
    );
    if (!rows.length) return "I don't see any internship matches for you yet - check back soon.";
    const list = rows.map(r => `- ${r.company_name} (${r.role_title}) - ${r.match_score}% match`).join('\n');
    return `Here are your top internship matches:\n${list}`;
  }

  if (lower.includes('print')) {
    return 'For your CIA, bring a printed copy of your hall ticket and admit card. Check Documents & Forms if your department requires any additional printouts.';
  }

  return "I can help with your exams, assignments, Blue Book submissions, and internship matches. Try asking me something like \"When is my next CIA?\"";
}

async function answerAdminFromRules(message, userId) {
  const lower = message.toLowerCase();

  if (lower.includes("haven't submitted") || lower.includes('not submitted')) {
    const { rows } = await pool.query(
      `SELECT full_name FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
       WHERE c.teacher_id = $1
       ORDER BY cs.roll_no ASC LIMIT 6`,
      [userId]
    );
    const names = rows.map((r) => r.full_name).join(', ');
    return names
      ? `Based on the current class roster, start by following up with these students: ${names}. A real submission tracker can replace this roster-based placeholder later.`
      : "I don't see a roster for your classes yet.";
  }

  if (lower.includes('reminder') && lower.includes('bba')) {
    const { rows: [task] } = await pool.query(
      `SELECT title, due_date FROM pending_tasks WHERE admin_id = $1 AND completed = false ORDER BY due_date ASC LIMIT 1`,
      [userId]
    );
    return `Draft reminder:\nDear BBA students, please complete ${task?.title || 'your pending academic work'}${task?.due_date ? ` by ${new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}. Reach out if you need clarification.`;
  }

  if (lower.includes('summarize') && lower.includes('questions')) {
    const { rows } = await pool.query(
      `SELECT subject, COUNT(*)::int AS count FROM student_queries
       WHERE (admin_id = $1 OR admin_id IS NULL) AND created_at >= now() - interval '7 days'
       GROUP BY subject ORDER BY count DESC`,
      [userId]
    );
    if (!rows.length) return 'No student questions have been logged this week.';
    return `Student questions this week:\n${rows.map((r) => `- ${r.subject}: ${r.count}`).join('\n')}`;
  }

  if (lower.includes('quiz') || lower.includes('central banking') || lower.includes('rbi')) {
    return 'Here is a 10-question quiz outline on Central Banking and RBI: monetary policy, repo rate, CRR, SLR, lender of last resort, inflation targeting, bank regulation, currency issue, payment systems, and financial stability.';
  }

  if (lower.includes('announcement') && lower.includes('council')) {
    const { rows: [meeting] } = await pool.query(
      `SELECT starts_at, location FROM events
       WHERE user_id = $1 AND title ILIKE '%Council Meeting%'
       ORDER BY starts_at ASC LIMIT 1`,
      [userId]
    );
    const when = meeting ? new Date(meeting.starts_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'today at 3:00 PM';
    return `Draft announcement:\nCouncil Meeting is scheduled for ${when}${meeting?.location ? ` at ${meeting.location}` : ''}. Members are requested to attend on time and bring agenda notes.`;
  }

  if (lower.includes('blue book')) {
    const { rows: [taskCount] } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM pending_tasks WHERE admin_id = $1 AND completed = false AND title ILIKE '%Blue Book%'`,
      [userId]
    );
    const { rows } = await pool.query(
      `SELECT full_name FROM class_students cs JOIN classes c ON c.id = cs.class_id
       WHERE c.teacher_id = $1 ORDER BY cs.roll_no ASC LIMIT 5`,
      [userId]
    );
    return `You have ${taskCount?.count || 0} open Blue Book-related task(s). Suggested reminders can go to: ${rows.map((r) => r.full_name).join(', ') || 'your BBA section'}.`;
  }

  const { rows: [summary] } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM pending_tasks WHERE admin_id = $1 AND completed = false) AS pending_tasks,
       (SELECT COUNT(*)::int FROM student_queries WHERE (admin_id = $1 OR admin_id IS NULL) AND answered = false) AS open_queries`,
    [userId]
  );
  return `I can help with teaching tasks, announcements, student questions, quizzes, and reminders. Right now you have ${summary.pending_tasks} pending task(s) and ${summary.open_queries} unanswered student querie(s).`;
}

router.post('/ask', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const reply = req.user.role === 'admin'
      ? await answerAdminFromRules(message, req.user.id)
      : await answerFromRules(message, req.user.id);
    res.json({ reply, source: 'mock' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Pulse AI failed to respond' });
  }
});

module.exports = router;
