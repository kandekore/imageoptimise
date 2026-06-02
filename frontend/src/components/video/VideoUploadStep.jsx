import { useCallback, useRef, useState } from 'react';
import { humanSize } from '../../lib/filename.js';

const MAX_PER_FILE = 500 * 1024 * 1024; // mirrors backend default

function isMp4(file) {
  const name = file.name?.toLowerCase() || '';
  return file.type === 'video/mp4' || name.endsWith('.mp4');
}

export default function VideoUploadStep({ files, setFiles, onBack, onNext }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [rejected, setRejected] = useState([]);

  const addFiles = useCallback(
    (incoming) => {
      const kept = [];
      const rejects = [];
      for (const f of incoming) {
        if (!isMp4(f)) rejects.push({ name: f.name, reason: 'Not an MP4' });
        else if (f.size > MAX_PER_FILE) rejects.push({ name: f.name, reason: 'Exceeds 500MB' });
        else kept.push(f);
      }
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
        return [...prev, ...kept.filter((f) => !seen.has(`${f.name}:${f.size}`))];
      });
      setRejected(rejects);
    },
    [setFiles],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      addFiles(Array.from(e.dataTransfer.files || []));
    },
    [addFiles],
  );

  const remove = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const clear = () => setFiles([]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Upload videos</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Drag & drop MP4 files or click to browse. Up to 500MB each.
      </p>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <strong>Drop MP4 videos here</strong>
        <div style={{ marginTop: '0.25rem' }}>or click to pick from your computer</div>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </div>

      {rejected.length > 0 && (
        <div className="banner error" style={{ marginTop: '1rem' }}>
          Skipped {rejected.length} file(s):{' '}
          {rejected.map((r) => `${r.name} (${r.reason})`).join(', ')}
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="file-summary">
            <span>{files.length} video(s) ready</span>
            <span>{humanSize(totalSize)} total</span>
          </div>
          <div className="file-list">
            {files.map((f, i) => (
              <div key={`${f.name}:${f.size}:${i}`} className="file-list-item">
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.name}
                </span>
                <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span>{humanSize(f.size)}</span>
                  <button className="ghost" onClick={() => remove(i)}>
                    remove
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
            <button className="ghost" onClick={clear}>
              Clear all
            </button>
          </div>
        </>
      )}

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <button className="primary" onClick={onNext} disabled={files.length === 0}>
          Compress {files.length > 0 ? `${files.length} video${files.length === 1 ? '' : 's'}` : 'videos'}
        </button>
      </div>
    </>
  );
}
