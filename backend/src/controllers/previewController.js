import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function previewImage(req, res) {
  const { filename } = req.params;
  // Prevent path traversal — filename must be a plain basename.
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  const filePath = path.join(config.paths.processedDir, filename);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ error: 'Not found.' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=600');
  return res.sendFile(filePath);
}
