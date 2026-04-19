# Image Optimise

A standalone web app for bulk image processing: resize, compress, convert, rename, and download as a ZIP. Designed to run locally today and move to FTP-backed storage later without frontend changes.

## Stack

- **Backend** — Node.js + Express, `sharp`, `multer`, `archiver`, `basic-ftp` (FTP path scaffolded).
- **Frontend** — React + Vite, wizard-style UX in 5 steps.
- **Storage layer** — pluggable (`local` today, `ftp` ready).

## Project structure

```
imageoptimise/
├── backend/
│   ├── src/
│   │   ├── controllers/     # process, download, preview
│   │   ├── middleware/      # multer upload
│   │   ├── routes/          # express router
│   │   ├── services/        # imageProcessor, storage, cleanup
│   │   ├── utils/           # filename sanitising, in-memory job store
│   │   ├── config.js
│   │   └── server.js
│   └── tmp/{uploads,processed}
└── frontend/
    └── src/
        ├── components/      # Stepper + 5 step components
        ├── hooks/           # useWizard
        ├── lib/             # api client, filename helpers
        └── styles/
```

## Run locally

You'll need Node 18+.

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

Open `http://localhost:5173`. Vite proxies `/process`, `/preview`, `/download`, and `/health` to the backend.

## Flow

1. **Settings** — format (WebP default / JPG / PNG), longest-side resize, compression preset (high=85, medium=70, low=55), rename toggle.
2. **Upload** — drag & drop multiple images, total size + count shown, client-side image-type + size validation.
3. **Processing** — files POSTed to `/process`; backend resizes, converts, compresses with `sharp` using `p-limit` for controlled concurrency. Response returns `{ id, originalName, previewUrl }` per image.
4. **Rename (optional)** — one-at-a-time editor, sanitises lowercase + hyphens + strips user-entered extensions, pre-fills from cleaned original filename, live preview of final filename.
5. **Download** — POST to `/download` with `{ ids, renames }`; backend builds a ZIP with `archiver`, applies final filenames, deletes delivered processed files and forgets their job entries afterwards.

## API

| Method | Path                | Purpose                                   |
| ------ | ------------------- | ----------------------------------------- |
| GET    | `/health`           | Health probe                              |
| POST   | `/process`          | Multipart upload + processing settings    |
| GET    | `/preview/:name`    | Stream a processed preview (local mode)   |
| POST   | `/download`         | ZIP of the processed files, with renames  |
| POST   | `/cleanup`          | Manual cleanup trigger (dev convenience)  |

Processing is **independent of renaming** — renames are applied only at the ZIP stage.

## Environment variables (backend)

See `backend/.env.example`. Key values:

| Var                        | Default                              | Purpose                                 |
| -------------------------- | ------------------------------------ | --------------------------------------- |
| `PORT`                     | `4000`                               | HTTP port                               |
| `CORS_ORIGIN`              | `http://localhost:5173`              | Allowed frontend origin                 |
| `MAX_FILE_SIZE_MB`         | `25`                                 | Per-file upload limit                   |
| `MAX_FILES_PER_REQUEST`    | `200`                                | Batch size limit                        |
| `PROCESSING_CONCURRENCY`   | `4`                                  | Parallel sharp pipelines                |
| `CLEANUP_MAX_AGE_MINUTES`  | `60`                                 | Temp-file TTL                           |
| `CLEANUP_INTERVAL_MINUTES` | `15`                                 | Sweep interval                          |
| `STORAGE_MODE`             | `local`                              | `local` or `ftp`                        |
| `FTP_*`                    | —                                    | FTP credentials / remote dir            |

## Storage abstraction

All processed files go through `backend/src/services/storage.js`:

```js
saveFile({ localPath, destName }, mode = 'local' | 'ftp')
```

- `local` (current): keeps the file in `backend/tmp/processed/`.
- `ftp` (scaffolded): uploads via `basic-ftp` to `FTP_REMOTE_DIR`. Controllers never touch the filesystem directly — flip `STORAGE_MODE=ftp` once deployment is ready and update the preview/download controllers to stream from the remote store.

## Cleanup

- Scheduled sweep every `CLEANUP_INTERVAL_MINUTES` removes files older than `CLEANUP_MAX_AGE_MINUTES` from both temp dirs and drops stale in-memory job entries.
- `/download` deletes delivered files as soon as the ZIP stream closes.

## Production notes

- Swap the in-memory `jobStore` for Redis (or a DB) if you want multi-instance deployments.
- Add auth at the API boundary before exposing the backend publicly.
- When moving to FTP, `/preview/:name` needs to fetch from the remote store (or be replaced by signed URLs); the rest of the flow does not change.
