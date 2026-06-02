import { useState } from 'react';
import { pickFolder } from '../../lib/api.js';

export default function UploadsSettingsStep({ settings, onChange, onNext }) {
  const [capEnabled, setCapEnabled] = useState(settings.maxPixelWidth != null);
  const [pickError, setPickError] = useState(null);
  const [picking, setPicking] = useState(null); // 'image' | 'video' | null

  const browse = async (kind) => {
    setPickError(null);
    setPicking(kind);
    try {
      const res = await pickFolder(kind);
      if (res.cancelled) return;
      if (res.path) {
        onChange(kind === 'video' ? { videoDestPath: res.path } : { imageDestPath: res.path });
      }
    } catch (err) {
      setPickError(err.message || 'Folder picker failed.');
    } finally {
      setPicking(null);
    }
  };

  const absolute = (p) => typeof p === 'string' && (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p));
  const canContinue =
    absolute(settings.imageDestPath) &&
    absolute(settings.videoDestPath) &&
    (!capEnabled || (settings.maxPixelWidth && settings.maxPixelWidth > 0));

  return (
    <>
      <h2 style={{ marginTop: 0 }}>WordPress uploads extractor</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Upload a zip of a WordPress <code>wp-content/uploads/</code> folder. The server walks
        every nested folder, drops WordPress-generated resize variants (<code>-WIDTHxHEIGHT</code>,{' '}
        <code>-scaled</code>, <code>-eTIMESTAMP</code>), then sorts originals into two folders.
      </p>

      <div className="form-grid">
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Images destination (absolute path on this machine)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="/Users/you/Desktop/client-images"
              value={settings.imageDestPath}
              onChange={(e) => onChange({ imageDestPath: e.target.value })}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => browse('image')} disabled={picking === 'image'}>
              {picking === 'image' ? 'Opening…' : 'Browse…'}
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            Created if it doesn't exist. Filenames are preserved; collisions get <code>-2</code>,{' '}
            <code>-3</code> suffixes.
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Videos destination (absolute path on this machine)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="/Users/you/Desktop/client-videos"
              value={settings.videoDestPath}
              onChange={(e) => onChange({ videoDestPath: e.target.value })}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => browse('video')} disabled={picking === 'video'}>
              {picking === 'video' ? 'Opening…' : 'Browse…'}
            </button>
          </div>
        </div>

        {pickError && (
          <div className="banner error" style={{ gridColumn: '1 / -1' }}>
            {pickError}
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Image size cap</label>
          <label className="toggle" style={{ marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={capEnabled}
              onChange={(e) => {
                setCapEnabled(e.target.checked);
                onChange({ maxPixelWidth: e.target.checked ? settings.maxPixelWidth || 1920 : null });
              }}
            />
            <span>Cap image width (pick the largest WP variant at or under this width)</span>
          </label>
          {capEnabled && (
            <div style={{ marginTop: '0.5rem', maxWidth: 240 }}>
              <input
                type="number"
                min={1}
                max={20000}
                step={10}
                value={settings.maxPixelWidth ?? ''}
                onChange={(e) => onChange({ maxPixelWidth: Math.max(1, Number(e.target.value) || 0) })}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                If no WP variant fits under the cap, the original is used (not resized).
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="actions">
        <span />
        <button className="primary" onClick={onNext} disabled={!canContinue}>
          Continue
        </button>
      </div>
    </>
  );
}
