const CODECS = [
  { value: 'h264', label: 'H.264 (best compatibility)' },
  { value: 'h265', label: 'H.265 (~30% smaller)' },
];

const COMPRESSION = [
  { value: 'high', label: 'High quality' },
  { value: 'medium', label: 'Balanced' },
  { value: 'low', label: 'Smallest file' },
];

const FPS_OPTIONS = [
  { value: 0, label: 'Keep original' },
  { value: 24, label: '24 fps' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
];

export default function VideoSettingsStep({ settings, onChange, onNext }) {
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Video settings</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Compress MP4 files for the web. Output is always MP4 with faststart enabled.
      </p>

      <div className="form-grid">
        <div>
          <label>Codec</label>
          <div className="segmented">
            {CODECS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={settings.codec === c.value ? 'active' : ''}
                onClick={() => onChange({ codec: c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            H.265 plays in Safari, Chrome and Edge. Firefox still lags on playback.
          </div>
        </div>

        <div>
          <label>Max width (px)</label>
          <input
            type="number"
            min={320}
            max={3840}
            step={10}
            value={settings.maxWidth}
            onChange={(e) =>
              onChange({ maxWidth: Math.max(320, Number(e.target.value) || 0) })
            }
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            Aspect ratio is preserved; videos are never upscaled.
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
          <label>Framerate cap</label>
          <div className="segmented">
            {FPS_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={settings.fpsCap === f.value ? 'active' : ''}
                onClick={() => onChange({ fpsCap: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Audio</label>
          <label className="toggle" style={{ marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={settings.stripAudio}
              onChange={(e) => onChange({ stripAudio: e.target.checked })}
            />
            <span>Remove audio track (smaller file)</span>
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
