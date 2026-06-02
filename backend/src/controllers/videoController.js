import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { config } from '../config.js';
import { normaliseVideoSettings, processVideoBatch } from '../services/videoProcessor.js';
import { saveFile } from '../services/storage.js';
import * as jobStore from '../utils/jobStore.js';
import { sanitizeBaseName, cleanOriginalName } from '../utils/filename.js';

function parseSettings(body) {
  if (body.settings) {
    try {
      return typeof body.settings === 'string' ? JSON.parse(body.settings) : body.settings;
    } catch {
      return {};
    }
  }
  return body;
}

export async function processVideos(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }
    const settings = normaliseVideoSettings(parseSettings(req.body));

    const results = await processVideoBatch(files, settings);

    const items = [];
    const errors = [];
    for (const r of results) {
      if (r.error) {
        errors.push({ originalName: r.originalName, message: r.message });
        continue;
      }
      await saveFile({ localPath: r.processedPath, destName: r.processedFilename });
      jobStore.put(r);
      items.push({
        id: r.id,
        originalName: r.originalName,
        previewUrl: r.previewUrl,
        format: r.format,
        codec: r.codec,
        width: r.width,
        height: r.height,
        duration: r.duration,
        size: r.size,
        originalSize: r.originalSize,
        originalWidth: r.originalWidth,
        originalHeight: r.originalHeight,
        hasAudio: r.hasAudio,
      });
    }

    return res.json({ settings, items, errors });
  } catch (err) {
    if (req.files) {
      await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    }
    next(err);
  }
}

export async function previewVideo(req, res) {
  const { filename } = req.params;
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }
  if (path.extname(filename).toLowerCase() !== '.mp4') {
    return res.status(400).json({ error: 'Only MP4 preview supported.' });
  }

  const filePath = path.join(config.paths.processedDir, filename);
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return res.status(404).json({ error: 'Not found.' });
  }

  const range = req.headers.range;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=600');

  if (!range) {
    res.setHeader('Content-Length', stat.size);
    return createReadStream(filePath).pipe(res);
  }

  // Range responses let browsers scrub the video without downloading the whole file.
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
  if (start >= stat.size || end >= stat.size) {
    res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
    return res.end();
  }

  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  res.setHeader('Content-Length', end - start + 1);
  return createReadStream(filePath, { start, end }).pipe(res);
}

function resolveFilename(item, renameMap) {
  const custom = renameMap.get(item.id);
  const base = custom ? sanitizeBaseName(custom) : cleanOriginalName(item.originalName);
  return `${base}.${item.extension}`;
}

function dedupeName(name, seen) {
  if (!seen.has(name)) {
    seen.add(name);
    return name;
  }
  const parsed = path.parse(name);
  let i = 2;
  while (seen.has(`${parsed.name}-${i}${parsed.ext}`)) i += 1;
  const candidate = `${parsed.name}-${i}${parsed.ext}`;
  seen.add(candidate);
  return candidate;
}

export async function downloadVideo(req, res, next) {
  try {
    const { id, newName } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'id is required.' });
    }
    const item = jobStore.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Video not found.' });
    }
    try {
      await fs.access(item.processedPath);
    } catch {
      return res.status(404).json({ error: 'File no longer available.' });
    }

    const base = newName ? sanitizeBaseName(newName) : cleanOriginalName(item.originalName);
    const filename = `${base}.${item.extension}`;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', (await fs.stat(item.processedPath)).size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    createReadStream(item.processedPath).pipe(res);
    // Don't delete on individual download — user may want to download again or grab the ZIP.
    // The periodic cleanup sweeper will remove stale files.
  } catch (err) {
    next(err);
  }
}

export async function downloadVideoZip(req, res, next) {
  try {
    const { ids = [], renames = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids is required and must be a non-empty array.' });
    }

    const renameMap = new Map(
      Array.isArray(renames)
        ? renames
            .filter((r) => r && r.id && typeof r.newName === 'string')
            .map((r) => [r.id, r.newName])
        : [],
    );

    const items = jobStore.getMany(ids);
    if (items.length === 0) {
      return res.status(404).json({ error: 'No matching processed videos found.' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="videos-${Date.now()}.zip"`,
    );

    const archive = archiver('zip', { zlib: { level: 0 } }); // videos are already compressed
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') throw err;
    });
    archive.on('error', (err) => next(err));
    archive.pipe(res);

    const seen = new Set();
    for (const item of items) {
      try {
        await fs.access(item.processedPath);
      } catch {
        continue;
      }
      const name = dedupeName(resolveFilename(item, renameMap), seen);
      archive.file(item.processedPath, { name });
    }

    await archive.finalize();

    res.on('close', async () => {
      await Promise.all(
        items.map(async (item) => {
          await fs.unlink(item.processedPath).catch(() => {});
          jobStore.remove(item.id);
        }),
      );
    });
  } catch (err) {
    next(err);
  }
}
