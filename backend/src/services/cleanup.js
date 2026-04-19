import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as jobStore from '../utils/jobStore.js';

async function sweepDir(dir, maxAgeMs) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    const fullPath = path.join(dir, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fullPath);
        removed += 1;
      }
    } catch {
      // ignore
    }
  }
  return removed;
}

export async function runCleanup() {
  const maxAgeMs = config.cleanup.maxAgeMinutes * 60 * 1000;
  const [uploadsRemoved, processedRemoved] = await Promise.all([
    sweepDir(config.paths.uploadsDir, maxAgeMs),
    sweepDir(config.paths.processedDir, maxAgeMs),
  ]);

  // Drop stale job store entries whose file is gone.
  const cutoff = Date.now() - maxAgeMs;
  for (const item of jobStore.all()) {
    if (item.createdAt < cutoff) jobStore.remove(item.id);
  }

  return { uploadsRemoved, processedRemoved };
}

export function startCleanupScheduler() {
  const intervalMs = Math.max(1, config.cleanup.intervalMinutes) * 60 * 1000;
  const timer = setInterval(() => {
    runCleanup().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[cleanup] failed:', err);
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}
