import { useEffect, useRef, useState } from 'react';
import { processExtract } from '../../lib/api.js';

export default function UploadsProcessingStep({ file, settings, onDone, onError, onBack }) {
  const [uploadPct, setUploadPct] = useState(0);
  const [phase, setPhase] = useState('uploading');
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const result = await processExtract(file, settings, {
          onProgress: (p) => {
            setUploadPct(p);
            if (p >= 100) setPhase('extracting');
          },
        });
        onDone(result);
      } catch (err) {
        setError(err.message || 'Extraction failed.');
        onError?.(err);
      }
    })();
  }, [file, settings, onDone, onError]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Processing</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        {phase === 'uploading'
          ? `Uploading ${file?.name}…`
          : 'Extracting archive and sorting files into your destination folders…'}
      </p>

      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: phase === 'uploading' ? `${uploadPct}%` : '100%' }}
        />
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        {phase === 'uploading'
          ? `${uploadPct}% uploaded`
          : 'Large archives can take a minute. Keep this tab open.'}
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
