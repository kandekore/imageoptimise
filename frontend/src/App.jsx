import { useState } from 'react';
import './styles/app.css';
import ImageApp from './ImageApp.jsx';
import VideoApp from './VideoApp.jsx';
import UploadsExtractorApp from './UploadsExtractorApp.jsx';

const TABS = [
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'uploads', label: 'WP Uploads' },
];

export default function App() {
  const [tab, setTab] = useState('images');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Media Optimise</h1>
        <p>Bulk compress images and videos for the web.</p>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="card">
        {tab === 'images' && <ImageApp />}
        {tab === 'videos' && <VideoApp />}
        {tab === 'uploads' && <UploadsExtractorApp />}
      </main>
    </div>
  );
}
