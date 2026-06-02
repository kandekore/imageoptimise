import { useState } from 'react';
import { downloadVideoZip, videoDownloadUrl } from '../../lib/api.js';
import { cleanOriginalName, humanSize } from '../../lib/filename.js';

function ratio(before, after) {
  if (!before || !after) return null;
  return Math.round((1 - after / before) * 100);
}

export default function VideoDownloadStep({ processed, settings, errors, onReset, onBack }) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);

  const totalSize = processed.reduce((s, p) => s + (p.size || 0), 0);
  const totalOriginal = processed.reduce((s, p) => s + (p.originalSize || 0), 0);
  const overallSavings = ratio(totalOriginal, totalSize);

  const handleDownloadAll = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadVideoZip({ ids: processed.map((p) => p.id), renames: [] });
      setDownloaded(true);
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Ready to download</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Your videos have been compressed. Grab them individually or as a ZIP.
      </p>

      {errors?.length > 0 && (
        <div className="banner">
          {errors.length} video(s) failed:{' '}
          {errors.map((e) => `${e.originalName} — ${e.message}`).join('; ')}
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <div className="label">Videos</div>
          <div className="value">{processed.length}</div>
        </div>
        <div className="summary-card">
          <div className="label">Codec</div>
          <div className="value">{settings.codec === 'h265' ? 'H.265' : 'H.264'}</div>
        </div>
        <div className="summary-card">
          <div className="label">Max width</div>
          <div className="value">{settings.maxWidth}px</div>
        </div>
        <div className="summary-card">
          <div className="label">Total size</div>
          <div className="value">
            {humanSize(totalSize)}
            {overallSavings !== null && overallSavings > 0 && (
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--success, #059669)',
                  marginLeft: '0.35rem',
                  fontWeight: 500,
                }}
              >
                −{overallSavings}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="video-list">
        {processed.map((p) => {
          const saved = ratio(p.originalSize, p.size);
          const finalName = `${cleanOriginalName(p.originalName)}.${p.format}`;
          return (
            <div className="video-card" key={p.id}>
              <video src={p.previewUrl} controls preload="metadata" />
              <div className="video-meta">
                <div className="video-name" title={finalName}>
                  {finalName}
                </div>
                <div className="video-stats">
                  <span>
                    {p.width}×{p.height}
                  </span>
                  <span>
                    {humanSize(p.originalSize)} → <strong>{humanSize(p.size)}</strong>
                    {saved !== null && saved > 0 && (
                      <span style={{ color: 'var(--success, #059669)', marginLeft: '0.35rem' }}>
                        −{saved}%
                      </span>
                    )}
                  </span>
                </div>
                <a
                  className="button primary"
                  href={videoDownloadUrl(p.id, cleanOriginalName(p.originalName))}
                  download={finalName}
                >
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="banner error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
      {downloaded && (
        <div className="banner success" style={{ marginTop: '1rem' }}>
          Download started. Server temp files will be cleared.
        </div>
      )}

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onReset}>Start over</button>
          {processed.length > 1 && (
            <button
              className="primary"
              onClick={handleDownloadAll}
              disabled={downloading}
            >
              {downloading ? 'Preparing ZIP…' : 'Download all as ZIP'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
