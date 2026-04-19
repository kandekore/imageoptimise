import { useEffect, useMemo, useState } from 'react';
import { cleanOriginalName, sanitizeBaseName } from '../lib/filename.js';

export default function RenameStep({ processed, renames, setRenames, onBack, onNext }) {
  const [index, setIndex] = useState(0);

  // Pre-fill renames with cleaned original names on first mount.
  useEffect(() => {
    setRenames((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of processed) {
        if (next[item.id] === undefined) {
          next[item.id] = cleanOriginalName(item.originalName);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [processed, setRenames]);

  const current = processed[index];
  const sanitizedPreview = useMemo(() => {
    if (!current) return '';
    const raw = renames[current.id] ?? '';
    const base = sanitizeBaseName(raw) || cleanOriginalName(current.originalName);
    return `${base}.${current.format}`;
  }, [current, renames]);

  if (!current) return null;

  const onChange = (value) => {
    // Strip extensions eagerly at input time.
    const stripped = value.replace(/\.[a-zA-Z0-9]{1,6}$/g, '');
    setRenames((prev) => ({ ...prev, [current.id]: stripped }));
  };

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(processed.length - 1, i + 1));

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Rename images</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Give each image a clean filename. Spaces become hyphens and special characters are stripped.
      </p>

      <div className="rename-layout">
        <div className="rename-preview">
          <img src={current.previewUrl} alt={current.originalName} />
          <div className="meta">
            {current.width}×{current.height} · {current.format.toUpperCase()} · {current.originalName}
          </div>
        </div>

        <div className="rename-panel">
          <h3>
            Image {index + 1} of {processed.length}
          </h3>
          <div className="counter">{processed.length - index - 1} remaining</div>

          <label>Filename (no extension needed)</label>
          <input
            type="text"
            value={renames[current.id] ?? ''}
            placeholder={cleanOriginalName(current.originalName)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (index < processed.length - 1) next();
                else onNext();
              }
            }}
            autoFocus
          />
          <div className="rename-preview-name">{sanitizedPreview}</div>

          <div className="rename-nav">
            <button onClick={prev} disabled={index === 0}>
              ← Previous
            </button>
            {index < processed.length - 1 ? (
              <button className="primary" onClick={next}>
                Next →
              </button>
            ) : (
              <button className="primary" onClick={onNext}>
                Finish renaming
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <span />
      </div>
    </>
  );
}
