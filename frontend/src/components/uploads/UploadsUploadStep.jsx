import { useCallback, useRef, useState } from 'react';
import { humanSize } from '../../lib/filename.js';

function isZip(file) {
  const name = file.name?.toLowerCase() || '';
  return name.endsWith('.zip');
}

export default function UploadsUploadStep({ file, setFile, onBack, onNext }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [rejected, setRejected] = useState(null);

  const addFile = useCallback(
    (incoming) => {
      const f = incoming[0];
      if (!f) return;
      if (!isZip(f)) {
        setRejected({ name: f.name, reason: 'Not a .zip file' });
        return;
      }
      setRejected(null);
      setFile(f);
    },
    [setFile],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      addFile(Array.from(e.dataTransfer.files || []));
    },
    [addFile],
  );

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Upload the uploads.zip</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Drop the zipped <code>wp-content/uploads/</code> folder. Just one zip at a time.
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
        <strong>Drop a .zip here</strong>
        <div style={{ marginTop: '0.25rem' }}>or click to pick from your computer</div>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          style={{ display: 'none' }}
          onChange={(e) => {
            addFile(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </div>

      {rejected && (
        <div className="banner error" style={{ marginTop: '1rem' }}>
          Skipped {rejected.name} — {rejected.reason}
        </div>
      )}

      {file && (
        <>
          <div className="file-summary">
            <span>{file.name}</span>
            <span>{humanSize(file.size)}</span>
          </div>
          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
            <button className="ghost" onClick={() => setFile(null)}>
              Remove
            </button>
          </div>
        </>
      )}

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <button className="primary" onClick={onNext} disabled={!file}>
          Extract
        </button>
      </div>
    </>
  );
}
