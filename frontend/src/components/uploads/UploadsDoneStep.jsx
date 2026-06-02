import { humanSize } from '../../lib/filename.js';

export default function UploadsDoneStep({ result, settings, onReset, onBack }) {
  if (!result) {
    return (
      <>
        <h2 style={{ marginTop: 0 }}>No results</h2>
        <div className="actions">
          <button onClick={onBack}>Back</button>
          <button className="primary" onClick={onReset}>
            Start over
          </button>
        </div>
      </>
    );
  }

  const { summary, images = [], videos = [], errors = [] } = result;
  const totalImageBytes = images.reduce((s, i) => s + (i.size || 0), 0);
  const totalVideoBytes = videos.reduce((s, v) => s + (v.size || 0), 0);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Extraction complete</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Files written directly to your destination folders.
      </p>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="label">Images written</div>
          <div className="value">{summary.imagesWritten}</div>
        </div>
        <div className="summary-card">
          <div className="label">Videos written</div>
          <div className="value">{summary.videosWritten}</div>
        </div>
        <div className="summary-card">
          <div className="label">WP variants dropped</div>
          <div className="value">{summary.variantsSkipped}</div>
        </div>
        <div className="summary-card">
          <div className="label">Non-media skipped</div>
          <div className="value">{summary.otherSkipped}</div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <div>
          <label>Images folder</label>
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-dim, #f3f4f6)',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
            }}
          >
            {settings.imageDestPath}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            {images.length} file(s), {humanSize(totalImageBytes)}
          </div>
        </div>
        <div>
          <label>Videos folder</label>
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-dim, #f3f4f6)',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
            }}
          >
            {settings.videoDestPath}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            {videos.length} file(s), {humanSize(totalVideoBytes)}
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="banner error" style={{ marginTop: '1rem' }}>
          {errors.length} error(s):{' '}
          {errors.slice(0, 5).map((e) => `${e.path} — ${e.message}`).join('; ')}
          {errors.length > 5 ? `, …and ${errors.length - 5} more` : ''}
        </div>
      )}

      <div className="actions">
        <button onClick={onBack}>Back</button>
        <button className="primary" onClick={onReset}>
          Start over
        </button>
      </div>
    </>
  );
}
