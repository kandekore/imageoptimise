// Mirrors backend filename sanitisation so the preview matches what will land in the ZIP.
export function sanitizeBaseName(name) {
  if (!name) return 'image';
  let base = String(name);
  while (true) {
    const dot = base.lastIndexOf('.');
    if (dot <= 0) break;
    const ext = base.slice(dot + 1);
    if (!/^[a-zA-Z0-9]{1,6}$/.test(ext)) break;
    base = base.slice(0, dot);
  }
  base = base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return base || 'image';
}

export function cleanOriginalName(originalName) {
  const dot = (originalName || '').lastIndexOf('.');
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName || '';
  return sanitizeBaseName(stem);
}

export function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
