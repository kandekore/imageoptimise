import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

const ACCEPTED_MIME = new Set(['video/mp4']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.paths.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `${nanoid(10)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ACCEPTED_MIME.has(file.mimetype) || ext === '.mp4') {
    return cb(null, true);
  }
  return cb(new Error(`Unsupported video type: ${file.mimetype || ext}. MP4 only.`));
}

export const videoUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxVideoFileSizeBytes,
    files: config.maxVideosPerRequest,
  },
});
