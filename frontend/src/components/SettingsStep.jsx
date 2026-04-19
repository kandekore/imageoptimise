const FORMATS = [
  { value: 'webp', label: 'WebP' },
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
];

const COMPRESSION = [
  { value: 'high', label: 'High (Q85)' },
  { value: 'medium', label: 'Medium (Q70)' },
  { value: 'low', label: 'Low (Q55)' },
];

export default function SettingsStep({ settings, onChange, onNext }) {
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Processing settings</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        These apply to every image you upload in this session.
      </p>

      <div className="form-grid">
        <div>
          <label>Output format</label>
          <div className="segmented">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={settings.format === f.value ? 'active' : ''}
                onClick={() => onChange({ format: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Longest side (px)</label>
          <input
            type="number"
            min={64}
            max={8000}
            value={settings.longestSide}
            onChange={(e) => onChange({ longestSide: Math.max(64, Number(e.target.value) || 0) })}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            Aspect ratio is preserved; images are never enlarged.
          </div>
        </div>

        <div>
          <label>Compression</label>
          <div className="segmented">
            {COMPRESSION.map((c) => (
              <button
                key={c.value}
                type="button"
                className={settings.compression === c.value ? 'active' : ''}
                onClick={() => onChange({ compression: c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Renaming</label>
          <label className="toggle" style={{ marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={settings.rename}
              onChange={(e) => onChange({ rename: e.target.checked })}
            />
            <span>Rename each image before download</span>
          </label>
        </div>
      </div>

      <div className="actions">
        <span />
        <button className="primary" onClick={onNext}>
          Continue
        </button>
      </div>
    </>
  );
}
