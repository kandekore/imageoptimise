import fs from 'node:fs/promises';
import path from 'node:path';
import {
  normaliseVideoSettings,
  processVideoBatch,
} from '../src/services/videoProcessor.js';

const SRC = '/tmp/sample-video.mp4';
const stat = await fs.stat(SRC);
console.log(`source: ${SRC}  ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

const file = {
  path: SRC,
  originalname: 'sample.mp4',
};

const scenarios = [
  { label: 'balanced H.264, audio kept',  codec: 'h264', compression: 'medium', stripAudio: false, maxWidth: 1920, fpsCap: 30 },
  { label: 'balanced H.264, audio stripped', codec: 'h264', compression: 'medium', stripAudio: true,  maxWidth: 1920, fpsCap: 30 },
  { label: 'smallest H.265, audio stripped', codec: 'h265', compression: 'low',    stripAudio: true,  maxWidth: 1920, fpsCap: 30 },
];

for (const s of scenarios) {
  // Each run destroys the source (processor unlinks after). Copy a fresh one per run.
  const tmpCopy = `/tmp/sample-video-${Date.now()}.mp4`;
  await fs.copyFile(SRC, tmpCopy);
  const settings = normaliseVideoSettings(s);
  const t0 = Date.now();
  const [res] = await processVideoBatch([{ ...file, path: tmpCopy }], settings);
  const ms = Date.now() - t0;
  if (res.error) {
    console.log(`\n${s.label}: ERROR -> ${res.message}`);
    continue;
  }
  const savings = Math.round((1 - res.size / stat.size) * 100);
  console.log(
    `\n${s.label}`,
    `\n  out:       ${path.basename(res.processedPath)}`,
    `\n  size:      ${(res.size / 1024 / 1024).toFixed(2)} MB  (−${savings}% vs source)`,
    `\n  dims:      ${res.width}x${res.height}`,
    `\n  duration:  ${res.duration?.toFixed(2)}s`,
    `\n  codec:     ${res.codec}`,
    `\n  audio:     ${res.hasAudio ? 'kept' : 'stripped'}`,
    `\n  encode:    ${(ms / 1000).toFixed(1)}s`,
  );
  await fs.unlink(res.processedPath).catch(() => {});
}
