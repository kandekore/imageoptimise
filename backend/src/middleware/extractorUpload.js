import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

const ACCEPTED_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'multipart/x-zip',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.paths.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.zip';
    cb(null, `${nanoid(10)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ACCEPTED_MIME.has(file.mimetype) || ext === '.zip') {
    return cb(null, true);
  }
  return cb(new Error(`Unsupported upload type: ${file.mimetype || ext}. ZIP only.`));
}

export const extractorUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxExtractorZipSizeBytes,
    files: 1,
  },
});
