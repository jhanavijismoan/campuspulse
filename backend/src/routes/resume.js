const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { syncMatchScoresForUser } = require('../lib/matchSync');

const router = express.Router();

const resumesDir = path.join(__dirname, '..', '..', 'public', 'resumes');
fs.mkdirSync(resumesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `resume-${req.user.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.docx', '.txt'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Please upload a PDF, DOCX, or TXT file.'), ok);
  },
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, file_url, original_filename, updated_at FROM student_resumes WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load resume' });
  }
});

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filePath = path.join(resumesDir, req.file.filename);
      let text = '';

      if (ext === '.pdf') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        text = data.text || '';
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }
      text = text.replace(/\s+/g, ' ').trim();

      if (!text) {
        return res.status(400).json({ error: "Couldn't read any text from that file — try a different PDF or a DOCX/TXT file instead." });
      }

      const { rows } = await pool.query(
        `INSERT INTO student_resumes (user_id, file_url, original_filename, extracted_text, active_cv_source, updated_at)
         VALUES ($1,$2,$3,$4,'uploaded', now())
         ON CONFLICT (user_id) DO UPDATE SET
           file_url = EXCLUDED.file_url,
           original_filename = EXCLUDED.original_filename,
           extracted_text = EXCLUDED.extracted_text,
           active_cv_source = 'uploaded',
           updated_at = now()
         RETURNING id, file_url, original_filename, updated_at, active_cv_source`,
        [req.user.id, `/resumes/${req.file.filename}`, req.file.originalname, text]
      );

      await pool.query(
        `UPDATE internship_applications SET match_score = NULL, match_reason = NULL, match_breakdown = NULL WHERE user_id = $1`,
        [req.user.id]
      );
      await syncMatchScoresForUser(req.user.id);

      res.status(201).json(rows[0]);
    } catch (procErr) {
      console.error(procErr);
      res.status(500).json({ error: 'Failed to process that file. Make sure it is a valid PDF, DOCX, or TXT resume.' });
    }
  });
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM student_resumes WHERE user_id = $1`, [req.user.id]);
    await pool.query(
      `UPDATE internship_applications SET match_score = NULL, match_reason = NULL WHERE user_id = $1`,
      [req.user.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove resume' });
  }
});

module.exports = router;
