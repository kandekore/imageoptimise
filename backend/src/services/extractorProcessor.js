import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import pLimit from 'p-limit';
import { config } from '../config.js';

const IMAGE_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.tif',
  '.avif', '.heic', '.heif', '.bmp', '.svg',
]);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogv', '.wmv']);

// WP auto-resized variants: name-WIDTHxHEIGHT.ext
const WP_SIZE_RE = /-(\d+)x(\d+)(?=\.[^.]+$)/i;
// WP "big image" scaled variant (>=2560px originals): name-scaled.ext
const WP_SCALED_RE = /-scaled(?=\.[^.]+$)/i;
// WP edited-image marker: name-eTIMESTAMP.ext (13-digit ms epoch)
const WP_EDITED_RE = /-e\d{13}(?=\.[^.]+$)/i;

export function normaliseExtractorSettings(raw = {}) {
  const imageDestPath = typeof raw.imageDestPath === 'string' ? raw.imageDestPath.trim() : '';
  const videoDestPath = typeof raw.videoDestPath === 'string' ? raw.videoDestPath.trim() : '';
  const rawMax = raw.maxPixelWidth;
  const parsedMax = parseInt(rawMax, 10);
  const maxPixelWidth =
    Number.isFinite(parsedMax) && parsedMax > 0 ? Math.min(parsedMax, 20000) : null;
  return { imageDestPath, videoDestPath, maxPixelWidth };
}

function classifyExt(ext) {
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return null;
}

function baseNameOf(fileName) {
  // Strip WP variant suffixes so siblings share one group key.
  // The regexes use a lookahead at the extension, so we apply them to the full filename.
  let out = fileName;
  out = out.replace(WP_SIZE_RE, '');
  out = out.replace(WP_SCALED_RE, '');
  out = out.replace(WP_EDITED_RE, '');
  return out.toLowerCase();
}

function variantInfo(fileName) {
  const sizeMatch = WP_SIZE_RE.exec(fileName);
  const width = sizeMatch ? parseInt(sizeMatch[1], 10) : null;
  return {
    width,
    isSized: Boolean(sizeMatch),
    isScaled: WP_SCALED_RE.test(fileName),
    isEdited: WP_EDITED_RE.test(fileName),
  };
}

function pickImageCandidate(group, maxPixelWidth) {
  // group: array of { entry, info } — one original (no markers) plus zero-or-more variants
  const edited = group.filter((g) => g.info.isEdited);
  const nonEdited = group.filter((g) => !g.info.isEdited);
  const pool = nonEdited.length > 0 ? nonEdited : edited;

  const original = pool.find((g) => !g.info.isSized && !g.info.isScaled);
  const scaled = pool.find((g) => !g.info.isSized && g.info.isScaled);
  const sized = pool.filter((g) => g.info.isSized).sort((a, b) => b.info.width - a.info.width);

  if (maxPixelWidth == null) {
    // No cap: prefer the true original, fall back to -scaled, then the largest variant.
    return original || scaled || sized[0] || pool[0];
  }

  // Cap set: prefer the largest WP variant at or under the cap.
  const underCap = sized.find((g) => g.info.width <= maxPixelWidth);
  if (underCap) return underCap;
  // No sized variant fits: the original / scaled is unknown-width so treat it as "largest".
  // Caller can decide to use it as-is since we picked option (a) "closest under, else fallback".
  if (original) return original;
  if (scaled) return scaled;
  // Everything is bigger than the cap; take the smallest oversized variant.
  const oversized = [...sized].sort((a, b) => a.info.width - b.info.width);
  return oversized[0] || pool[0];
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function isSafeRelPath(p) {
  if (!p) return false;
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p)) return false;
  const parts = p.split(/[\\/]/);
  return !parts.includes('..');
}

async function dedupeWrite(destDir, preferredName, data) {
  const parsed = path.parse(preferredName);
  let candidate = preferredName;
  let i = 2;
  for (;;) {
    const full = path.join(destDir, candidate);
    try {
      await fs.writeFile(full, data, { flag: 'wx' });
      return candidate;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      candidate = `${parsed.name}-${i}${parsed.ext}`;
      i += 1;
    }
  }
}

export async function extractAndSort(zipFile, settings) {
  if (!isAbsolutePath(settings.imageDestPath)) {
    throw new Error('imageDestPath must be an absolute path.');
  }
  if (!isAbsolutePath(settings.videoDestPath)) {
    throw new Error('videoDestPath must be an absolute path.');
  }

  await ensureDir(settings.imageDestPath);
  await ensureDir(settings.videoDestPath);

  const zip = new AdmZip(zipFile.path);
  const entries = zip.getEntries();

  // Group candidate files by basename per directory so siblings (photo.jpg + photo-300x200.jpg) land together.
  const groups = new Map(); // groupKey -> { kind, items: [{entry, info}] }
  let skippedVariants = 0;
  let skippedOther = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const relEntryPath = entry.entryName;
    if (!isSafeRelPath(relEntryPath)) {
      skippedOther += 1;
      continue;
    }
    const fileName = path.basename(relEntryPath);
    const dirName = path.dirname(relEntryPath);
    const ext = path.extname(fileName).toLowerCase();
    const kind = classifyExt(ext);
    if (!kind) {
      skippedOther += 1;
      continue;
    }

    if (kind === 'video') {
      // Videos aren't WP-resized; route straight through (each its own group).
      const key = `video::${relEntryPath}`;
      groups.set(key, { kind, items: [{ entry, info: variantInfo(fileName) }] });
      continue;
    }

    const info = variantInfo(fileName);
    const groupKey = `image::${dirName}::${baseNameOf(fileName)}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { kind, items: [] });
    groups.get(groupKey).items.push({ entry, info });
  }

  const limit = pLimit(Math.max(1, config.extractorConcurrency));
  const images = [];
  const videos = [];
  const errors = [];

  const tasks = [];
  for (const group of groups.values()) {
    if (group.kind === 'video') {
      const { entry } = group.items[0];
      const finalName = path.basename(entry.entryName);
      tasks.push(
        limit(async () => {
          try {
            const data = entry.getData();
            const written = await dedupeWrite(settings.videoDestPath, finalName, data);
            videos.push({
              originalPath: entry.entryName,
              writtenName: written,
              size: data.length,
            });
          } catch (err) {
            errors.push({ path: entry.entryName, message: err.message });
          }
        }),
      );
      continue;
    }

    // image group
    const picked = pickImageCandidate(group.items, settings.maxPixelWidth);
    if (!picked) continue;
    const droppedInGroup = group.items.length - 1;
    if (droppedInGroup > 0) skippedVariants += droppedInGroup;

    tasks.push(
      limit(async () => {
        try {
          const data = picked.entry.getData();
          // Preserve the filename as it appears in the zip (including the -WxH suffix if
          // that's the variant the user asked for via maxPixelWidth).
          const finalName = path.basename(picked.entry.entryName);
          const written = await dedupeWrite(settings.imageDestPath, finalName, data);
          images.push({
            originalPath: picked.entry.entryName,
            writtenName: written,
            size: data.length,
            variant: picked.info.isSized
              ? `${picked.info.width}px`
              : picked.info.isScaled
                ? 'scaled'
                : 'original',
          });
        } catch (err) {
          errors.push({ path: picked.entry.entryName, message: err.message });
        }
      }),
    );
  }

  await Promise.all(tasks);

  await fs.unlink(zipFile.path).catch(() => {});

  return {
    settings,
    summary: {
      imagesWritten: images.length,
      videosWritten: videos.length,
      variantsSkipped: skippedVariants,
      otherSkipped: skippedOther,
      errorsCount: errors.length,
    },
    images,
    videos,
    errors,
  };
}

function isAbsolutePath(p) {
  return typeof p === 'string' && path.isAbsolute(p);
}
