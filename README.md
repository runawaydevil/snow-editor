# Snow Editor — Markdown Cozy

**Version:** 0.0.1  
**Creator:** Pablo Murad — [pablomurad@pm.me](mailto:pablomurad@pm.me)

A cozy online editor inspired by snow and calm reading. Write in **Markdown** or experimental **Org-mode** with live preview. Use it **locally** in the browser (localStorage) or **share** documents by link with a small backend API.

## Features

- Real-time editor with side-by-side preview
- **Markdown** (full) and **Org-mode** (experimental, basic parser)
- **Local mode** — drafts in `localStorage`, import/export `.md` / `.org`
- **Shared links** — view-only and edit links with optional expiry
- **Edit lock** — only one editor at a time per document (no realtime collaboration)
- **Server autosave** on shared edit links (debounced 1s)
- Mode switch saved in `localStorage` (local editor only)
- Production Docker: nginx (frontend) + Node API (backend) + SQLite volume
- Preview HTML sanitized with [DOMPurify](https://github.com/cure53/DOMPurify)

## Stack

- **Frontend:** React + Vite + react-router-dom
- **Backend:** Node.js (≥22.5) + Express + SQLite (`node:sqlite`)
- [marked](https://marked.js.org/) — Markdown to HTML
- Custom Org parser — [`src/lib/parseOrgMode.js`](src/lib/parseOrgMode.js)
- Plain CSS (cozy / snow theme)

## Prerequisites

- **Local:** Node.js **22.5+** (frontend + backend)
- **Docker:** Docker and Docker Compose

## Environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ALLOWED_HOSTS` | Hostnames for Vite dev/preview |
| `PORT` | Backend port (default `41738`) |
| `DATABASE_PATH` | SQLite path (default `./data/snow.db`) |
| `CORS_ORIGIN` | Optional; dev only if not using Vite proxy |
| `VITE_API_BASE` | Optional API prefix (empty = `/api` on same origin) |
| `VITE_PUBLIC_ORIGIN` | Public site URL for share links (e.g. `https://snow.pablomurad.com`). If empty, uses the browser origin (`localhost` in local dev) |
| `VITE_ALLOW_SEARCH_INDEXING` | `true` to allow search engines; `false` adds `noindex` meta and `Disallow: /` in `robots.txt`. **Rebuild required** after changing |

### Search engine indexing

Set in `.env` before `npm run build` or Docker build:

- `VITE_ALLOW_SEARCH_INDEXING=false` (default) — site and shared links are not indexed; `robots.txt` blocks crawlers
- `VITE_ALLOW_SEARCH_INDEXING=true` — public indexing allowed

The API (`/api/*`) always sends `X-Robots-Tag: noindex` via nginx, regardless of this setting.

## Run with Docker

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:41737 |
| Backend API | http://localhost:41738/api/health |

SQLite data is stored in `./data/snow.db` (volume `./data:/app/data` on the backend service).

The frontend nginx proxies `/api/` to the backend container.

## Run locally with npm

**Terminal 1 — frontend:**

```bash
npm install
cp .env.example .env
npm run dev
```

Open: **http://localhost:41737**

**Terminal 2 — backend:**

```bash
cd backend
npm install
npm run dev
```

API: **http://localhost:41738/api/health**

Vite proxies `/api` → `http://localhost:41738` in dev and preview.

```bash
npm run build
npm run preview   # frontend only; backend must still be running for sharing
```

## Share a document

1. Open the **local** editor at `/`.
2. Click **Share**.
3. Set title and link expiry (1h, 24h, 7d, 30d, or never).
4. Copy the **view link** (`/v/...`) or **edit link** (`/e/...`). URLs use `VITE_PUBLIC_ORIGIN` when set; otherwise they use whatever host you opened in the browser.

### View link (`/v/:token`)

- Read-only preview
- Download `.md` or `.org`
- No server saves

### Edit link (`/e/:token`)

- Tries to acquire an **edit lock** for your browser (`snow_client_id` in localStorage)
- If lock granted: live preview, **Save to server**, autosave after 1s idle
- If another person holds the lock: read-only + friendly message
- **Release edit lock** releases the lock for others

### Edit lock rules

- One active editor per document
- Lock TTL: **2 minutes**; renewed every **30 seconds** while the tab is open
- Lock release on tab close is best-effort (`fetch` keepalive)

### Link expiry

- Optional expiry when creating the share
- Expired links return **410** with a friendly page: “This link has expired.”

## Local editor (unchanged)

- Routes: `/` only for local editing
- Badge **Online**
- Autosave to `localStorage` (500ms debounce)
- **Save .md** / **Save .org**, **Import**, **Clear**, mode switch

### Browser storage keys

| Key | Purpose |
|-----|---------|
| `editor_mode` | Last selected mode |
| `snow_editor_markdown_content` | Markdown draft |
| `snow_editor_org_content` | Org-mode draft |
| `snow_client_id` | Browser id for shared edit locks |

## API endpoints

| Method | Path |
|--------|------|
| GET | `/api/health` |
| POST | `/api/documents` |
| GET | `/api/documents/view/:token` |
| GET | `/api/documents/edit/:token` |
| POST | `/api/documents/edit/:token/lock` |
| POST | `/api/documents/edit/:token/lock/refresh` |
| DELETE | `/api/documents/edit/:token/lock` |
| PUT | `/api/documents/edit/:token` |

Rate limit: 60 requests/minute per IP on `/api`. Max document size: **1 MB**.

## Current limitations

- No realtime collaboration (no WebSocket, Yjs, CRDT, remote cursors)
- No version history UI (`document_versions` is stored server-side only)
- No login or user accounts
- No email or PDF export
- Anyone with a valid **edit link** can edit when the document is not locked
- `POST /api/documents` is open (mitigated by rate limit and long random tokens)

## Security

- Preview uses DOMPurify on the frontend
- Tokens: `crypto.randomBytes(32)`; IDs: `crypto.randomUUID()`
- Org parser escapes text before applying markup

## Project structure

```
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── utils.js
│       └── routes/documents.js
├── data/                 # SQLite (gitignored, .gitkeep only)
├── docker-compose.yml
├── Dockerfile            # frontend static build
├── nginx.conf
├── src/
│   ├── App.jsx           # routes
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── lib/
└── public/
```

## Maintenance and optimization

Repeat before each release:

1. `npm run build` — confirm chunk sizes; no errors
2. `rg` for stray Portuguese in `src/` and `backend/src/` — should be empty
3. `VITE_ALLOW_SEARCH_INDEXING=false` — view-source has `noindex`; `/robots.txt` contains `Disallow: /`
4. `VITE_ALLOW_SEARCH_INDEXING=true` — no blocking robots meta; `/robots.txt` allows crawlers
5. Shared routes (`/v/`, `/e/`) load via lazy chunks (smaller initial bundle on `/`)
6. Rebuild Docker images after any `VITE_*` change

**Kept light by design:** inline SVG icons (no icon font), lazy `marked`, manual vendor chunks, minimal backend deps (`express` + `node:sqlite`).

## Manual test checklist

1. `docker compose up -d --build` works
2. Frontend at http://localhost:41737
3. `GET /api/health` returns `{ "ok": true }`
4. Local editor at `/` works (Markdown + Org, import, clear, localStorage)
5. **Share** creates view + edit links
6. `/v/:token` is read-only
7. `/e/:token` edits with autosave when lock is free
8. Second browser/profile on same edit link → read-only (423)
9. Lock expires after ~2 minutes without refresh
10. Expired share shows friendly message
11. Content over 1 MB rejected with 413
12. Download `.md` / `.org` still works on shared pages
13. `/robots.txt` and HTML robots meta match `VITE_ALLOW_SEARCH_INDEXING`

## License

Free to use for personal projects and learning.
