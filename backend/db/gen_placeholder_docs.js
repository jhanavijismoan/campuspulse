// Generates simple placeholder PDF-like text files for each seeded document
// so the "Download" buttons in the UI resolve to something real instead of 404ing.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function run() {
  const dir = path.join(__dirname, '..', 'public', 'files');
  fs.mkdirSync(dir, { recursive: true });
  const { rows } = await pool.query('SELECT title, category, file_url FROM documents');
  for (const doc of rows) {
    const filename = path.basename(doc.file_url);
    const filePath = path.join(dir, filename);
    const content = `${doc.title}\n${doc.category || ''}\n\nThis is a placeholder file generated for the CampusPulse demo.\nReplace with real uploaded content in production.\n`;
    fs.writeFileSync(filePath, content);
  }
  console.log(`Wrote ${rows.length} placeholder files to ${dir}`);
  await pool.end();
}
run();
