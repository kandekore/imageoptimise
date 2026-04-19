import { Router } from 'express';
import express from 'express';
import { uploadMiddleware } from '../middleware/upload.js';
import { processImages } from '../controllers/processController.js';
import { downloadZip } from '../controllers/downloadController.js';
import { previewImage } from '../controllers/previewController.js';
import { runCleanup } from '../services/cleanup.js';

export function buildRouter() {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  router.post('/process', uploadMiddleware.array('images'), processImages);

  router.get('/preview/:filename', previewImage);

  router.post('/download', express.json({ limit: '1mb' }), downloadZip);

  // Manual trigger — useful during development.
  router.post('/cleanup', async (_req, res, next) => {
    try {
      const result = await runCleanup();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
