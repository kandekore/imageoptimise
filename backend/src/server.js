import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import multer from 'multer';
import { config } from './config.js';
import { buildRouter } from './routes/index.js';
import { startCleanupScheduler } from './services/cleanup.js';

async function ensureDirs() {
  await fs.mkdir(config.paths.uploadsDir, { recursive: true });
  await fs.mkdir(config.paths.processedDir, { recursive: true });
}

function errorHandler(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

export async function createServer() {
  await ensureDirs();

  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      credentials: false,
    }),
  );

  app.use('/', buildRouter());
  app.use(errorHandler);

  return app;
}

async function main() {
  const app = await createServer();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[imageoptimise] listening on http://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`[imageoptimise] storage mode: ${config.storage.mode}`);
  });

  startCleanupScheduler();

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`[imageoptimise] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal]', err);
  process.exit(1);
});
