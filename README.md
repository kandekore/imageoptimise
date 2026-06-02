# Media Optimise

A standalone web app for bulk media processing. Three tools under one wizard-style UI:

- **Images** — resize, compress, convert (WebP/JPG/PNG), rename, download as a ZIP.
- **Videos** — transcode to web-friendly MP4 (H.264/H.265), downscale, cap FPS, strip audio, download individually or as a ZIP.
- **WP Uploads** — extract a WordPress `uploads` ZIP and sort it into image/video destination folders on disk, de-duplicating WordPress's auto-generated size variants.

Designed to run locally today and move to FTP-backed storage later without frontend changes.

## Stack

- **Backend** — Node.js + Express, `sharp` (images), `fluent-ffmpeg` + `ffmpeg-static`/`ffprobe-static` (video), `adm-zip` (WP extractor), `multer`, `archiver`, `p-limit`, `basic-ftp` (FTP path scaffolded).
- **Frontend** — React + Vite, tabbed shell with a separate wizard per tool.
- **Storage layer** — pluggable (`local` today, `ftp` ready).

## Project structure

```
imageoptimise/
├── backend/
│   ├── src/
│   │   ├── controllers/     # process, download, preview, video, extractor
│   │   ├── middleware/      # multer upload (image / video / extractor)
│   │   ├── routes/          # express router
│   │   ├── services/        # imageProcessor, videoProcessor, extractorProcessor, storage, cleanup
│   │   ├── utils/           # filename sanitising, in-memory job store
│   │   ├── config.js
│   │   └── server.js
│   └── tmp/{uploads,processed}
└── frontend/
    └── src/
        ├── ImageApp.jsx / VideoApp.jsx / UploadsExtractorApp.jsx
        ├── components/      # shared Stepper + per-tool step components (video/, uploads/)
        ├── hooks/           # useWizard, useVideoWizard, useUploadsExtractorWizard
        ├── lib/             # api client, filename helpers
        └── styles/
```

## Run locally

You'll need Node 18+. The video tool relies on the bundled `ffmpeg-static`/`ffprobe-static` binaries — no system ffmpeg required.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/process`, `/preview`, `/download`, `/health`, `/video`, and `/extracts` to the backend.

## Tools & flows

### Images
1. **Settings** — format (WebP default / JPG / PNG), longest-side resize, compression preset (high=85, medium=70, low=55), rename toggle.
2. **Upload** — drag & drop multiple images, total size + count shown, client-side image-type + size validation.
3. **Processing** — files POSTed to `/process`; backend resizes, converts, compresses with `sharp` using `p-limit` for controlled concurrency. Response returns `{ id, originalName, previewUrl }` per image.
4. **Rename (optional)** — one-at-a-time editor, sanitises lowercase + hyphens + strips user-entered extensions, pre-fills from cleaned original filename, live preview of final filename.
5. **Download** — POST to `/download` with `{ ids, renames }`; backend builds a ZIP with `archiver`, applies final filenames, deletes delivered processed files and forgets their job entries afterwards.

### Videos
1. **Settings** — codec (H.264 default / H.265), max width (downscale only, 320–3840), compression preset (high/medium/low → CRF), FPS cap (0 = keep source), strip-audio toggle.
2. **Upload** — drag & drop MP4 files (MP4 only today), per-file and batch size limits enforced.
3. **Processing** — POSTed to `/video/process`; backend transcodes with `fluent-ffmpeg` (`-preset medium`, `+faststart` for progressive playback) one video at a time by default (`VIDEO_CONCURRENCY=1`). Returns per-video metadata (size before/after, dimensions, duration, codec).
4. **Download** — stream a single MP4 via `GET /video/download?id=…&newName=…`, or POST `/video/download` with `{ ids, renames }` for a ZIP (stored with no compression — video is already compressed). ZIP delivery deletes the delivered files on stream close.

> **Note:** video transcoding is the heaviest workload here and runs inline in the request. On a small/shared server, cap or isolate ffmpeg's CPU (e.g. `-threads`, `nice`, or a cgroup/Docker `--cpus` quota) before exposing it. See backlog for the deferred plan.

### WP Uploads extractor
1. **Settings** — pick absolute image and video destination folders (native folder picker via `/extracts/pick-folder`; falls back to manual entry), optional `maxPixelWidth` to prefer a specific WordPress size variant.
2. **Upload** — drop a WordPress `uploads` ZIP (up to `MAX_EXTRACTOR_ZIP_SIZE_MB`).
3. **Processing** — POSTed to `/extracts/process`; backend groups WordPress size variants (`name-WxH`, `-scaled`, `-eTIMESTAMP`) by original, picks one representative image per group (largest under `maxPixelWidth`, else the original), copies images and videos into their destination folders with safe de-duplicated filenames, and skips junk. Returns a summary (`imagesWritten`, `videosWritten`, `variantsSkipped`, …) plus per-file lists and errors.

Image processing is **independent of renaming** — renames are applied only at the ZIP stage.

## API

| Method | Path                      | Purpose                                          |
| ------ | ------------------------- | ------------------------------------------------ |
| GET    | `/health`                 | Health probe                                     |
| POST   | `/process`                | Image multipart upload + processing settings     |
| GET    | `/preview/:name`          | Stream a processed image preview (local mode)    |
| POST   | `/download`               | ZIP of processed images, with renames            |
| POST   | `/video/process`          | Video multipart upload + transcode settings      |
| GET    | `/video/preview/:name`    | Stream a transcoded MP4 (supports HTTP ranges)   |
| GET    | `/video/download`         | Download a single transcoded MP4 by `id`         |
| POST   | `/video/download`         | ZIP of transcoded videos, with renames           |
| POST   | `/extracts/process`       | Extract + sort a WordPress uploads ZIP           |
| POST   | `/extracts/pick-folder`   | Open a native folder picker (local/desktop use)  |
| POST   | `/cleanup`                | Manual cleanup trigger (dev convenience)         |

## Environment variables (backend)

See `backend/.env.example`. Key values (defaults from `config.js`):

| Var                          | Default                   | Purpose                                       |
| ---------------------------- | ------------------------- | --------------------------------------------- |
| `PORT`                       | `4000`                    | HTTP port                                     |
| `CORS_ORIGIN`                | `http://localhost:5173`   | Allowed frontend origin                       |
| `MAX_FILE_SIZE_MB`           | `25`                      | Per-image upload limit                        |
| `MAX_FILES_PER_REQUEST`      | `200`                     | Image batch size limit                        |
| `MAX_VIDEO_FILE_SIZE_MB`     | `500`                     | Per-video upload limit                        |
| `MAX_VIDEOS_PER_REQUEST`     | `10`                      | Video batch size limit                        |
| `MAX_EXTRACTOR_ZIP_SIZE_MB`  | `4096`                    | WP uploads ZIP size limit                     |
| `PROCESSING_CONCURRENCY`     | `4`                       | Parallel sharp pipelines                      |
| `VIDEO_CONCURRENCY`          | `1`                       | Parallel ffmpeg transcodes                    |
| `EXTRACTOR_CONCURRENCY`      | `4`                       | Parallel file writes during extraction        |
| `CLEANUP_MAX_AGE_MINUTES`    | `60`                      | Temp-file TTL                                 |
| `CLEANUP_INTERVAL_MINUTES`   | `15`                      | Sweep interval                                |
| `STORAGE_MODE`               | `local`                   | `local` or `ftp`                              |
| `FTP_*`                      | —                         | FTP credentials / remote dir                  |

> `.env.example` currently lists the image/cleanup/FTP vars; the video and extractor vars above are read by `config.js` with the defaults shown and can be added as needed.

## Storage abstraction

Processed image and video files go through `backend/src/services/storage.js`:

```js
saveFile({ localPath, destName }, mode = 'local' | 'ftp')
```

- `local` (current): keeps the file in `backend/tmp/processed/`.
- `ftp` (scaffolded): uploads via `basic-ftp` to `FTP_REMOTE_DIR`. Controllers never touch the filesystem directly — flip `STORAGE_MODE=ftp` once deployment is ready and update the preview/download controllers to stream from the remote store.

The WP Uploads extractor is separate: it writes directly to the user-supplied destination folders and is intended for local/desktop use (the folder picker shells out to `osascript`/PowerShell/`zenity`).

## Cleanup

- Scheduled sweep every `CLEANUP_INTERVAL_MINUTES` removes files older than `CLEANUP_MAX_AGE_MINUTES` from both temp dirs and drops stale in-memory job entries.
- `/download` and `/video/download` (ZIP) delete delivered files as soon as the stream closes.

## Production notes

- Swap the in-memory `jobStore` for Redis (or a DB) if you want multi-instance deployments.
- Add auth at the API boundary before exposing the backend publicly.
- **Video CPU:** ffmpeg runs as a child process and will saturate cores. Cap it (`-threads`, `nice`, systemd `CPUQuota`, or Docker `--cpus`) or move transcoding to a background worker/queue before serving real traffic — the request is currently held open for the whole encode.
- The WP Uploads extractor's folder picker only works where the backend runs on the user's own desktop; it is not suitable for a headless/remote deployment.
- When moving to FTP, `/preview/:name` and `/video/preview/:name` need to fetch from the remote store (or be replaced by signed URLs); the rest of the flow does not change.
