const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getPagesForRole } = require('../lib/pageRegistry');

const router = express.Router();

// GET /api/search?q=<query>
// Returns { pages, announcements, documents } each with { id, title, subtitle, url, type }
router.get('/', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length < 2) return res.json({ pages: [], announcements: [], documents: [] });
  if (q.length > 200) return res.status(400).json({ error: 'Query too long' });

  const like = `%${q}%`;
  const { university_id, role, id: userId } = req.user;

  try {
    // ── Pages ────────────────────────────────────────────────────────────────
    const pages = getPagesForRole(role)
      .filter((p) => p.enabled !== false)
      .filter((p) =>
        p.label.toLowerCase().includes(q.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(q.toLowerCase()) ||
        (p.keywords || []).some((k) => k.toLowerCase().includes(q.toLowerCase()))
      )
      .slice(0, 6)
      .map((p) => ({ type: 'page', id: p.key, title: p.label, subtitle: p.description || '', url: p.path }));

    // ── Announcements ────────────────────────────────────────────────────────
    let annQuery, annParams;
    if (role === 'admin') {
      annQuery = `SELECT id, title, body, status FROM announcements
                  WHERE university_id = $1 AND (title ILIKE $2 OR body ILIKE $2)
                  ORDER BY created_at DESC LIMIT 5`;
      annParams = [university_id, like];
    } else {
      annQuery = `SELECT id, title, body FROM announcements
                  WHERE university_id = $1 AND status = 'published'
                  AND (title ILIKE $2 OR body ILIKE $2)
                  AND (audience IS NULL OR audience = '' OR EXISTS (
                    SELECT 1 FROM users WHERE id = $3
                    AND (role = 'student')
                  ))
                  ORDER BY created_at DESC LIMIT 5`;
      annParams = [university_id, like, userId];
    }
    const { rows: annRows } = await pool.query(annQuery, annParams);
    const announcements = annRows.map((r) => ({
      type: 'announcement',
      id: r.id,
      title: r.title || 'Untitled Announcement',
      subtitle: (r.body || '').slice(0, 80),
      url: '/announcements',
      badge: r.status === 'draft' ? 'Draft' : null,
    }));

    // ── Documents ────────────────────────────────────────────────────────────
    let docQuery, docParams;
    if (role === 'admin') {
      docQuery = `SELECT id, title, category FROM documents
                  WHERE university_id = $1 AND title ILIKE $2
                  ORDER BY updated_at DESC LIMIT 5`;
      docParams = [university_id, like];
    } else {
      docQuery = `SELECT id, title, category FROM documents
                  WHERE university_id = $1 AND title ILIKE $2
                  AND (audience IS NULL OR audience ILIKE '%all%' OR audience ILIKE $3)
                  ORDER BY updated_at DESC LIMIT 5`;
      docParams = [university_id, like, `%${req.user.program || ''}%`];
    }
    const { rows: docRows } = await pool.query(docQuery, docParams);
    const documents = docRows.map((r) => ({
      type: 'document',
      id: r.id,
      title: r.title,
      subtitle: r.category || 'Document',
      url: '/documents',
    }));

    res.json({ pages, announcements, documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
