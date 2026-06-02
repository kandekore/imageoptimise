import fs from 'node:fs/promises';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { extractAndSort, normaliseExtractorSettings } from '../services/extractorProcessor.js';

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

export async function processExtract(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No zip uploaded.' });
    }
    const settings = normaliseExtractorSettings(parseSettings(req.body));
    if (!settings.imageDestPath || !settings.videoDestPath) {
      await fs.unlink(file.path).catch(() => {});
      return res
        .status(400)
        .json({ error: 'Both imageDestPath and videoDestPath are required.' });
    }

    const result = await extractAndSort(file, settings);
    return res.json(result);
  } catch (err) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
}

function runPicker(command, args) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return reject(new Error(`Folder picker unavailable: ${err.message}`));
    }
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      reject(new Error(`Folder picker unavailable: ${err.message}`));
    });
    child.on('close', (code) => {
      const out = stdout.trim();
      if (code === 0) {
        if (!out) return resolve({ cancelled: true });
        return resolve({ path: out });
      }
      // Typical cancel exit codes: osascript=1 ("User canceled."), zenity=1, PowerShell custom exit=1.
      if (code === 1 || /cancel/i.test(stderr)) return resolve({ cancelled: true });
      reject(new Error(stderr.trim() || `Picker exited with code ${code}`));
    });
  });
}

export async function pickFolder(req, res, next) {
  try {
    const kind = req.body?.kind === 'video' ? 'video' : 'image';
    const prompt = kind === 'video' ? 'Choose videos destination folder' : 'Choose images destination folder';
    const platform = os.platform();

    let command;
    let args;

    if (platform === 'darwin') {
      const script = `POSIX path of (choose folder with prompt "${prompt}")`;
      command = 'osascript';
      args = ['-e', script];
    } else if (platform === 'win32') {
      const ps = [
        '[System.Threading.Thread]::CurrentThread.ApartmentState = "STA" | Out-Null;',
        'Add-Type -AssemblyName System.Windows.Forms | Out-Null;',
        '$f = New-Object System.Windows.Forms.FolderBrowserDialog;',
        `$f.Description = '${prompt}';`,
        "if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath } else { exit 1 }",
      ].join(' ');
      command = 'powershell';
      args = ['-NoProfile', '-STA', '-Command', ps];
    } else {
      command = 'zenity';
      args = ['--file-selection', '--directory', `--title=${prompt}`];
    }

    const result = await runPicker(command, args);
    if (result.cancelled) return res.json({ cancelled: true });
    return res.json({ path: result.path });
  } catch (err) {
    // Treat picker failure as a recoverable 500 with a readable message.
    return res
      .status(500)
      .json({ error: err.message || 'Folder picker failed.' });
  }
}
