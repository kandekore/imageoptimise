// Smoke test for the WP uploads extractor service.
// Builds a synthetic wp-content/uploads zip, runs the service, asserts results.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { extractAndSort, normaliseExtractorSettings } from '../src/services/extractorProcessor.js';

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function buildZip(entries) {
  const zip = new AdmZip();
  for (const [name, content] of entries) {
    zip.addFile(name, Buffer.from(content));
  }
  return zip;
}

async function writeZip(zip) {
  const dir = await tempDir('wpzip-');
  const zipPath = path.join(dir, 'uploads.zip');
  zip.writeZip(zipPath);
  return zipPath;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  } else {
    console.log('pass:', msg);
  }
}

async function listFiles(dir) {
  try {
    return (await fs.readdir(dir)).sort();
  } catch {
    return [];
  }
}

async function run() {
  const entries = [
    // Images: one original + several WP-generated variants + edited marker
    ['uploads/2024/01/photo.jpg', 'ORIGINAL_PHOTO_DATA_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'],
    ['uploads/2024/01/photo-150x150.jpg', '150'],
    ['uploads/2024/01/photo-300x200.jpg', '300'],
    ['uploads/2024/01/photo-1024x768.jpg', '1024'],
    ['uploads/2024/01/photo-scaled.jpg', 'SCALED'],
    ['uploads/2024/01/photo-e1717200000000.jpg', 'EDITED'],

    // A second image with only variants, no plain original
    ['uploads/2024/01/banner-768x432.png', '768'],
    ['uploads/2024/01/banner-1920x1080.png', '1920'],

    // Another image in a different dir: shares same basename as first, must NOT cross-group
    ['uploads/2024/02/photo.jpg', 'DIFFERENT_PHOTO_IN_FEB'],

    // Videos — not resized by WP; both should be kept
    ['uploads/2024/02/clip.mp4', 'VIDEO_DATA_MP4'],
    ['uploads/2024/02/intro.mov', 'VIDEO_DATA_MOV'],

    // Non-media, should be skipped
    ['uploads/2024/02/notes.pdf', 'PDF'],
    ['uploads/2024/02/.DS_Store', 'DS'],

    // Zip-slip guard
    ['../evil.jpg', 'MALICIOUS'],
  ];

  // ---- Case 1: no maxPixelWidth ----
  {
    const zipPath = await writeZip(buildZip(entries));
    const imgDir = await tempDir('imgs-');
    const vidDir = await tempDir('vids-');

    const settings = normaliseExtractorSettings({
      imageDestPath: imgDir,
      videoDestPath: vidDir,
      maxPixelWidth: null,
    });
    const result = await extractAndSort({ path: zipPath }, settings);

    console.log('\n--- Case 1: no cap ---');
    console.log(JSON.stringify(result.summary, null, 2));

    const imgs = await listFiles(imgDir);
    const vids = await listFiles(vidDir);
    console.log('images ->', imgs);
    console.log('videos ->', vids);

    // Two "photo.jpg" groups (different dirs) → the second collides and gets -2.
    assert(imgs.includes('photo.jpg'), 'keeps the original photo.jpg (no cap)');
    assert(imgs.includes('photo-2.jpg'), 'collision of same-name originals gets -2 suffix');
    assert(imgs.includes('banner-1920x1080.png'), 'no plain original → pick the largest variant');
    assert(!imgs.some((n) => n.includes('-150x150')), 'drops -150x150 variant');
    assert(!imgs.some((n) => n.includes('-300x200')), 'drops -300x200 variant');
    assert(!imgs.some((n) => n.includes('-1024x768')), 'drops -1024x768 variant');
    assert(!imgs.some((n) => n === 'photo-scaled.jpg'), 'drops -scaled variant when original exists');
    assert(!imgs.some((n) => n.includes('-e17172')), 'drops -eTIMESTAMP edited variant');
    assert(vids.includes('clip.mp4') && vids.includes('intro.mov'), 'keeps both videos');
    assert(!imgs.includes('notes.pdf') && !vids.includes('notes.pdf'), 'drops pdf');
    assert(result.summary.variantsSkipped >= 5, 'summary counts dropped variants');

    await fs.rm(imgDir, { recursive: true, force: true });
    await fs.rm(vidDir, { recursive: true, force: true });
  }

  // ---- Case 2: maxPixelWidth = 500 ----
  {
    const zipPath = await writeZip(buildZip(entries));
    const imgDir = await tempDir('imgs-');
    const vidDir = await tempDir('vids-');

    const settings = normaliseExtractorSettings({
      imageDestPath: imgDir,
      videoDestPath: vidDir,
      maxPixelWidth: 500,
    });
    const result = await extractAndSort({ path: zipPath }, settings);
    console.log('\n--- Case 2: cap 500 ---');
    console.log(JSON.stringify(result.summary, null, 2));
    const imgs = await listFiles(imgDir);
    console.log('images ->', imgs);

    assert(imgs.includes('photo-300x200.jpg'), 'cap=500 picks 300x200 (largest under 500)');
    // banner has no variant under 500: no original, fallback is the smallest oversized (768x432)
    assert(imgs.includes('banner-768x432.png'), 'banner falls back to smallest oversized when no variant fits cap');

    await fs.rm(imgDir, { recursive: true, force: true });
    await fs.rm(vidDir, { recursive: true, force: true });
  }

  // ---- Case 3: maxPixelWidth = 100 (all variants too big) ----
  {
    const zipPath = await writeZip(buildZip(entries));
    const imgDir = await tempDir('imgs-');
    const vidDir = await tempDir('vids-');

    const settings = normaliseExtractorSettings({
      imageDestPath: imgDir,
      videoDestPath: vidDir,
      maxPixelWidth: 100,
    });
    await extractAndSort({ path: zipPath }, settings);
    const imgs = await listFiles(imgDir);
    console.log('\n--- Case 3: cap 100 ---');
    console.log('images ->', imgs);
    // photo group: has original → prefer original (unknown width)
    assert(imgs.includes('photo.jpg'), 'cap=100 with an original present → keeps original (unknown width)');
    // banner group: no original, fallback to smallest oversized (768x432)
    assert(imgs.includes('banner-768x432.png'), 'cap=100 banner falls back to smallest oversized');

    await fs.rm(imgDir, { recursive: true, force: true });
    await fs.rm(vidDir, { recursive: true, force: true });
  }

  console.log('\nAll assertions passed.');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
