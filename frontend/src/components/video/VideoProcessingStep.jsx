import { useEffect, useRef, useState } from 'react';
import { processVideos } from '../../lib/api.js';

export default function VideoProcessingStep({ files, settings, onDone, onError, onBack }) {
  const [uploadPct, setUploadPct] = useState(0);
  const [phase, setPhase] = useState('uploading');
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const result = await processVideos(files, settings, {
          onProgress: (p) => {
            setUploadPct(p);
            if (p >= 100) setPhase('encoding');
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
          ? `Uploading ${files.length} video${files.length === 1 ? '' : 's'}…`
          : `Encoding to ${settings.codec === 'h265' ? 'H.265' : 'H.264'} MP4…`}
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
          : 'Encoding can take several minutes for long or high-resolution videos. Keep this tab open.'}
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
