// End-to-end HTTP test: start server, post a zip, check destination folders.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import AdmZip from 'adm-zip';

const PORT = 4399;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(`http://localhost:${PORT}/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('Server never became healthy');
}

async function main() {
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  try {
    await waitForHealth();

    const zip = new AdmZip();
    zip.addFile('uploads/2024/01/photo.jpg', Buffer.from('ORIG'));
    zip.addFile('uploads/2024/01/photo-150x150.jpg', Buffer.from('150'));
    zip.addFile('uploads/2024/01/photo-1920x1080.jpg', Buffer.from('1920'));
    zip.addFile('uploads/2024/02/clip.mp4', Buffer.from('VID'));
    zip.addFile('uploads/2024/02/notes.pdf', Buffer.from('PDF'));

    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-'));
    const imgDir = path.join(tmpRoot, 'images');
    const vidDir = path.join(tmpRoot, 'videos');

    const blob = new Blob([zip.toBuffer()], { type: 'application/zip' });
    const form = new FormData();
    form.append('settings', JSON.stringify({
      imageDestPath: imgDir,
      videoDestPath: vidDir,
      maxPixelWidth: null,
    }));
    form.append('zipFile', blob, 'test.zip');

    const res = await fetch(`http://localhost:${PORT}/extracts/process`, {
      method: 'POST',
      body: form,
    });
    const body = await res.json();
    console.log('HTTP', res.status, JSON.stringify(body.summary, null, 2));

    const imgs = await fs.readdir(imgDir);
    const vids = await fs.readdir(vidDir);
    console.log('images dir:', imgs);
    console.log('videos dir:', vids);

    if (!imgs.includes('photo.jpg') || !vids.includes('clip.mp4')) {
      console.error('FAIL: unexpected outputs');
      process.exitCode = 1;
    } else if (imgs.some((n) => n.includes('-150x150') || n.includes('-1920x1080'))) {
      console.error('FAIL: variants were written');
      process.exitCode = 1;
    } else {
      console.log('PASS: end-to-end HTTP test');
    }

    await fs.rm(tmpRoot, { recursive: true, force: true });
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
