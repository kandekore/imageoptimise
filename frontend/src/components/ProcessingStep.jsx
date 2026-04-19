import { useEffect, useRef, useState } from 'react';
import { processImages } from '../lib/api.js';

export default function ProcessingStep({ files, settings, onDone, onError, onBack }) {
  const [uploadPct, setUploadPct] = useState(0);
  const [phase, setPhase] = useState('uploading');
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const result = await processImages(files, settings, {
          onProgress: (p) => {
            setUploadPct(p);
            if (p >= 100) setPhase('processing');
          },
        });
        onDone(result);
      } catch (err) {
        setError(err.message || 'Processing failed.');
        onError?.(err);
      }
    })();
  }, [files, settings, onDone, onError]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Processing</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        {phase === 'uploading'
          ? `Uploading ${files.length} image${files.length === 1 ? '' : 's'}…`
          : `Resizing & converting to ${settings.format.toUpperCase()}…`}
      </p>

      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: phase === 'uploading' ? `${uploadPct}%` : '100%' }}
        />
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        {phase === 'uploading' ? `${uploadPct}% uploaded` : 'Server is processing — this can take a moment for large batches.'}
      </div>

      {error && (
        <div className="banner error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {error && (
        <div className="actions">
          <button onClick={onBack}>Back</button>
          <span />
        </div>
      )}
    </>
  );
}
