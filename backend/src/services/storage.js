// Storage abstraction. Use saveFile() in any new code that persists artefacts
// so switching to FTP later is a one-line change.
//
// Contract:
//   saveFile({ localPath, destName, contentType? }, mode = config.storage.mode)
//     -> { mode, url, remotePath?, localPath }
//
// - mode "local" currently just keeps the file where it already is.
// - mode "ftp" uploads to the configured remote dir (scaffolded, disabled by default).

import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../config.js';

async function saveLocal({ localPath, destName }) {
  // For local mode, processed files already live in config.paths.processedDir.
  // If a caller passes a file outside that directory, copy it in.
  const processedDir = config.paths.processedDir;
  const currentDir = path.dirname(localPath);
  let finalPath = localPath;
  if (path.resolve(currentDir) !== path.resolve(processedDir)) {
    finalPath = path.join(processedDir, destName || path.basename(localPath));
    await fs.copyFile(localPath, finalPath);
  }
  return {
    mode: 'local',
    localPath: finalPath,
    url: `/preview/${path.basename(finalPath)}`,
  };
}

async function saveFtp({ localPath, destName }) {
  // Lazy import so the dependency only loads when FTP is actually used.
  const { Client } = await import('basic-ftp');
  const client = new Client();
  try {
    await client.access({
      host: config.storage.ftp.host,
      port: config.storage.ftp.port,
      user: config.storage.ftp.user,
      password: config.storage.ftp.password,
      secure: config.storage.ftp.secure,
    });
    await client.ensureDir(config.storage.ftp.remoteDir);
    const remoteName = destName || path.basename(localPath);
    const remotePath = path.posix.join(config.storage.ftp.remoteDir, remoteName);
    await client.uploadFrom(localPath, remotePath);
    return {
      mode: 'ftp',
      localPath,
      remotePath,
      url: remotePath,
    };
  } finally {
    client.close();
  }
}

export async function saveFile(fileRef, mode = config.storage.mode) {
  if (mode === 'ftp') return saveFtp(fileRef);
  return saveLocal(fileRef);
}
