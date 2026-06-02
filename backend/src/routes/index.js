import { Router } from 'express';
import express from 'express';
import { uploadMiddleware } from '../middleware/upload.js';
import { videoUploadMiddleware } from '../middleware/videoUpload.js';
import { extractorUploadMiddleware } from '../middleware/extractorUpload.js';
import { processImages } from '../controllers/processController.js';
import { downloadZip } from '../controllers/downloadController.js';
import { previewImage } from '../controllers/previewController.js';
import {
  processVideos,
  previewVideo,
  downloadVideo,
  downloadVideoZip,
} from '../controllers/videoController.js';
import { processExtract, pickFolder } from '../controllers/extractorController.js';
import { runCleanup } from '../services/cleanup.js';

export function buildRouter() {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  router.post('/process', uploadMiddleware.array('images'), processImages);

  router.get('/preview/:filename', previewImage);

  router.post('/download', express.json({ limit: '1mb' }), downloadZip);

  router.post('/video/process', videoUploadMiddleware.array('videos'), processVideos);
  router.get('/video/preview/:filename', previewVideo);
  router.get('/video/download', downloadVideo);
  router.post('/video/download', express.json({ limit: '1mb' }), downloadVideoZip);

  router.post('/extracts/process', extractorUploadMiddleware.single('zipFile'), processExtract);
  router.post('/extracts/pick-folder', express.json({ limit: '1kb' }), pickFolder);

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
