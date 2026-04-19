import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

const ACCEPTED_MIME = new Set([
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.paths.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${nanoid(10)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (ACCEPTED_MIME.has(file.mimetype) || file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  return cb(new Error(`Unsupported file type: ${file.mimetype}`));
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: config.maxFilesPerRequest,
  },
});
