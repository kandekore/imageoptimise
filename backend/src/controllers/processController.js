import fs from 'node:fs/promises';
import { normaliseSettings, processBatch } from '../services/imageProcessor.js';
import { saveFile } from '../services/storage.js';
import * as jobStore from '../utils/jobStore.js';

function parseSettings(body) {
  if (body.settings) {
    try {
      return typeof body.settings === 'string' ? JSON.parse(body.settings) : body.settings;
    } catch {
      return {};
    }
  }
  return {
    format: body.format,
    longestSide: body.longestSide,
    compression: body.compression,
    rename: body.rename === 'true' || body.rename === true,
  };
}

export async function processImages(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }
    const settings = normaliseSettings(parseSettings(req.body));

    const results = await processBatch(files, settings);

    const items = [];
    const errors = [];
    for (const r of results) {
      if (r.error) {
        errors.push({ originalName: r.originalName, message: r.message });
        continue;
      }
      // Route through storage layer so swapping to FTP later is transparent.
      await saveFile({ localPath: r.processedPath, destName: r.processedFilename });
      jobStore.put(r);
      items.push({
        id: r.id,
        originalName: r.originalName,
        previewUrl: r.previewUrl,
        format: r.format,
        width: r.width,
        height: r.height,
        size: r.size,
      });
    }

    return res.json({ settings, items, errors });
  } catch (err) {
    // Multer errors include rejected files already; ensure stray uploads are removed.
    if (req.files) {
      await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    }
    next(err);
  }
}
