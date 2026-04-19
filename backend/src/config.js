import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const toBool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 4000),
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 25) * 1024 * 1024,
  maxFilesPerRequest: toInt(process.env.MAX_FILES_PER_REQUEST, 200),

  processingConcurrency: toInt(process.env.PROCESSING_CONCURRENCY, 4),

  cleanup: {
    maxAgeMinutes: toInt(process.env.CLEANUP_MAX_AGE_MINUTES, 60),
    intervalMinutes: toInt(process.env.CLEANUP_INTERVAL_MINUTES, 15),
  },

  paths: {
    backendRoot,
    uploadsDir: path.join(backendRoot, 'tmp', 'uploads'),
    processedDir: path.join(backendRoot, 'tmp', 'processed'),
  },

  storage: {
    mode: (process.env.STORAGE_MODE || 'local').toLowerCase(),
    ftp: {
      host: process.env.FTP_HOST || '',
      port: toInt(process.env.FTP_PORT, 21),
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASSWORD || '',
      secure: toBool(process.env.FTP_SECURE, false),
      remoteDir: process.env.FTP_REMOTE_DIR || '/public_html/uploads/processed/',
    },
  },
};
