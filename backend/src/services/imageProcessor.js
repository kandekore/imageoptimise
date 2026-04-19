import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { extensionForFormat } from '../utils/filename.js';

const QUALITY_MAP = {
  high: 85,
  medium: 70,
  low: 55,
};

const ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function resolveQuality(compression) {
  return QUALITY_MAP[compression] ?? QUALITY_MAP.medium;
}

export function normaliseSettings(raw = {}) {
  const format = ALLOWED_FORMATS.has(String(raw.format).toLowerCase())
    ? String(raw.format).toLowerCase()
    : 'webp';
  const longestSide = Math.max(64, Math.min(parseInt(raw.longestSide, 10) || 2000, 8000));
  const compression = ['high', 'medium', 'low'].includes(raw.compression)
    ? raw.compression
    : 'medium';
  const rename = Boolean(raw.rename);

  return { format: format === 'jpeg' ? 'jpg' : format, longestSide, compression, rename };
}

function applyFormat(pipeline, format, quality) {
  switch (format) {
    case 'jpg':
      return pipeline.jpeg({ quality, mozjpeg: true });
    case 'png':
      // PNG uses compressionLevel 0-9; map quality loosely.
      return pipeline.png({
        compressionLevel: Math.max(0, Math.min(9, Math.round((100 - quality) / 10))),
        adaptiveFiltering: true,
      });
    case 'webp':
    default:
      return pipeline.webp({ quality });
  }
}

async function processOne(file, settings) {
  const id = nanoid(12);
  const ext = extensionForFormat(settings.format);
  const outputFilename = `${id}.${ext}`;
  const outputPath = path.join(config.paths.processedDir, outputFilename);
  const quality = resolveQuality(settings.compression);

  // Stream from disk to avoid loading full image into memory for the orchestrator.
  const pipeline = sharp(file.path, { failOn: 'none' }).rotate().resize({
    width: settings.longestSide,
    height: settings.longestSide,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const info = await applyFormat(pipeline, settings.format, quality).toFile(outputPath);

  // Delete the raw upload now that the processed copy exists.
  await fs.unlink(file.path).catch(() => {});

  return {
    id,
    originalName: file.originalname,
    processedFilename: outputFilename,
    processedPath: outputPath,
    previewUrl: `/preview/${outputFilename}`,
    format: settings.format,
    extension: ext,
    width: info.width,
    height: info.height,
    size: info.size,
    createdAt: Date.now(),
  };
}

export async function processBatch(files, settings) {
  const limit = pLimit(config.processingConcurrency);
  const tasks = files.map((file) =>
    limit(async () => {
      try {
        return await processOne(file, settings);
      } catch (err) {
        // Cleanup the raw upload on failure and surface a structured error row.
        await fs.unlink(file.path).catch(() => {});
        return {
          error: true,
          originalName: file.originalname,
          message: err?.message || 'Failed to process image',
        };
      }
    }),
  );
  return Promise.all(tasks);
}
