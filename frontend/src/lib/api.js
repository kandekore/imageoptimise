export async function processImages(files, settings, { onProgress } = {}) {
  const form = new FormData();
  form.append('settings', JSON.stringify(settings));
  files.forEach((f) => form.append('images', f, f.name));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/process');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error) msg = data.error;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.send(form);
  });
}

export async function downloadZip({ ids, renames }) {
  const res = await fetch('/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, renames }),
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `images-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function processVideos(files, settings, { onProgress } = {}) {
  const form = new FormData();
  form.append('settings', JSON.stringify(settings));
  files.forEach((f) => form.append('videos', f, f.name));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/video/process');
    // Encoding can take minutes for long videos — don't let the browser bail early.
    xhr.timeout = 0;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error) msg = data.error;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.send(form);
  });
}

export async function downloadVideoZip({ ids, renames }) {
  const res = await fetch('/video/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, renames }),
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `videos-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function videoDownloadUrl(id, newName) {
  const params = new URLSearchParams({ id });
  if (newName) params.set('newName', newName);
  return `/video/download?${params.toString()}`;
}

export async function pickFolder(kind) {
  const res = await fetch('/extracts/pick-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) {
    let msg = `Folder picker failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json(); // { path } or { cancelled: true }
}

export async function processExtract(zipFile, settings, { onProgress } = {}) {
  const form = new FormData();
  form.append('settings', JSON.stringify(settings));
  form.append('zipFile', zipFile, zipFile.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/extracts/process');
    // Extraction of large WP archives can take a while — no timeout.
    xhr.timeout = 0;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error) msg = data.error;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.send(form);
  });
}
