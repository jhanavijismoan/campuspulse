'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const filesDir = path.join(__dirname, '..', '..', 'public', 'files');
fs.mkdirSync(filesDir, { recursive: true });

const ALLOWED_EXTS = new Set(['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.ppt', '.png', '.jpg', '.jpeg']);
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/png', 'image/jpeg',
]);

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    const base = slugify(path.basename(file.originalname, ext) || req.body.title || 'document');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) return cb(new Error(`File type '${ext}' not allowed.`), false);
    if (file.mimetype && !ALLOWED_MIMES.has(file.mimetype) && !file.mimetype.startsWith('image/')) {
      return cb(new Error(`MIME type '${file.mimetype}' not accepted.`), false);
    }
    cb(null, true);
  },
});

// GET /api/documents
router.get('/', requireAuth, async (req, res) => {
  const { category, q } = req.query;
  try {
    const params = [req.user.university_id];
    let query = `SELECT * FROM documents WHERE university_id = $1`;

    if (req.user.role === 'student') {
      query += ` AND taken_down = false`;
      query += ` AND (audience IS NULL OR audience ILIKE '%all%' OR audience ILIKE $2)`;
      params.push(`%${req.user.program || ''}%`);
    }

    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (q) { params.push(`%${q}%`); query += ` AND title ILIKE $${params.length}`; }
    query += ` ORDER BY updated_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// POST /api/documents — admin upload
router.post('/', requireAuth, requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { title, category, audience } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    let fileUrl;
    if (req.file) {
      fileUrl = `/files/${req.file.filename}`;
    } else {
      const filename = `${slugify(title)}-${Date.now()}.txt`;
      fs.writeFileSync(path.join(filesDir, filename), `${title}\n\nPlaceholder file for CampusPulse demo.\n`);
      fileUrl = `/files/${filename}`;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO documents (university_id, title, category, audience, file_url)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.university_id, title, category || 'Study Material', audience || 'All Students', fileUrl]
      );
      res.status(201).json(rows[0]);
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });
});

// PATCH /api/documents/:id/takedown — soft delete
router.patch('/:id/takedown', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE documents SET taken_down = true, taken_down_at = now(), taken_down_by = $3, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to take down document' });
  }
});

// PATCH /api/documents/:id/restore
router.patch('/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE documents SET taken_down = false, taken_down_at = null, taken_down_by = null, updated_at = now()
       WHERE id = $1 AND university_id = $2 RETURNING *`,
      [req.params.id, req.user.university_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore document' });
  }
});

// DELETE /api/documents/:id — hard delete (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM documents WHERE id = $1 AND university_id = $2`,
      [id, req.user.university_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Document not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
