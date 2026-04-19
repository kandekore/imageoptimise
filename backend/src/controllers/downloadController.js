import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import * as jobStore from '../utils/jobStore.js';
import { sanitizeBaseName, cleanOriginalName } from '../utils/filename.js';

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

export async function downloadZip(req, res, next) {
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
      return res.status(404).json({ error: 'No matching processed images found.' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="images-${Date.now()}.zip"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
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
        continue; // silently skip missing files (cleanup may have run)
      }
      const name = dedupeName(resolveFilename(item, renameMap), seen);
      archive.file(item.processedPath, { name });
    }

    await archive.finalize();

    // Post-download cleanup: remove delivered files and job entries.
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
