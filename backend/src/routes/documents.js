const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const filesDir = path.join(__dirname, '..', '..', 'public', 'files');
fs.mkdirSync(filesDir, { recursive: true });

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = slugify(path.basename(file.originalname, ext) || req.body.title || 'document');
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/', requireAuth, async (req, res) => {
  const { category, q } = req.query;
  try {
    let query = `SELECT * FROM documents WHERE 1=1`;
    const params = [];
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      query += ` AND title ILIKE $${params.length}`;
    }
    query += ` ORDER BY updated_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// Accepts a real uploaded file (multipart/form-data, field name "file").
// If no file is attached, falls back to generating a placeholder text file
// so the record always has something real to download instead of 404ing.
router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const { title, category, audience } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  let fileUrl;
  if (req.file) {
    fileUrl = `/files/${req.file.filename}`;
  } else {
    const filename = `${slugify(title)}-${Date.now()}.txt`;
    const content = `${title}\n${category || ''}\n\nThis is a placeholder file generated for the CampusPulse demo.\nReplace with a real uploaded file in production.\n`;
    fs.writeFileSync(path.join(filesDir, filename), content);
    fileUrl = `/files/${filename}`;
  }

  try {
    const { rows: [user] } = await pool.query(`SELECT university_id FROM users WHERE id = $1`, [req.user.id]);
    const { rows } = await pool.query(
      `INSERT INTO documents (university_id, title, category, audience, file_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user?.university_id || null, title, category || 'Study Material', audience || 'All Students', fileUrl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM documents WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Document not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
