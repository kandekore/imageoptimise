import path from 'node:path';

export const EXTENSION_BY_FORMAT = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export function sanitizeBaseName(name) {
  if (!name || typeof name !== 'string') return 'image';
  let base = name;
  // Strip any extension the user may have typed.
  while (true) {
    const ext = path.extname(base);
    if (!ext) break;
    base = base.slice(0, -ext.length);
  }
  base = base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return base || 'image';
}

export function cleanOriginalName(originalName) {
  const parsed = path.parse(originalName || '');
  return sanitizeBaseName(parsed.name);
}

export function extensionForFormat(format) {
  return EXTENSION_BY_FORMAT[format] || 'webp';
}
