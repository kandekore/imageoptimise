import { useState } from 'react';
import { downloadZip } from '../lib/api.js';
import { cleanOriginalName, sanitizeBaseName, humanSize } from '../lib/filename.js';

export default function DownloadStep({ processed, renames, settings, errors, onReset, onBack }) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);

  const totalSize = processed.reduce((s, p) => s + (p.size || 0), 0);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const renameList = settings.rename
        ? processed.map((p) => ({
            id: p.id,
            newName: sanitizeBaseName(renames[p.id] ?? '') || cleanOriginalName(p.originalName),
          }))
        : [];
      await downloadZip({
        ids: processed.map((p) => p.id),
        renames: renameList,
      });
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
        Your images have been optimised. Download them as a single ZIP.
      </p>

      {errors?.length > 0 && (
        <div className="banner">
          {errors.length} image(s) failed to process:{' '}
          {errors.map((e) => e.originalName).join(', ')}
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <div className="label">Images</div>
          <div className="value">{processed.length}</div>
        </div>
        <div className="summary-card">
          <div className="label">Format</div>
          <div className="value">{settings.format.toUpperCase()}</div>
        </div>
        <div className="summary-card">
          <div className="label">Longest side</div>
          <div className="value">{settings.longestSide}px</div>
        </div>
        <div className="summary-card">
          <div className="label">Total size</div>
          <div className="value">{humanSize(totalSize)}</div>
        </div>
      </div>

      <div className="thumbs">
        {processed.map((p) => {
          const finalName = settings.rename
            ? `${sanitizeBaseName(renames[p.id] ?? '') || cleanOriginalName(p.originalName)}.${p.format}`
            : `${cleanOriginalName(p.originalName)}.${p.format}`;
          return (
            <div className="thumb" key={p.id}>
              <img src={p.previewUrl} alt={p.originalName} loading="lazy" />
              <div className="name" title={finalName}>
                {finalName}
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
          Download started. Temp files will be cleared from the server.
        </div>
      )}

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onReset}>Start over</button>
          <button className="primary" onClick={handleDownload} disabled={downloading || processed.length === 0}>
            {downloading ? 'Preparing ZIP…' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </>
  );
}
