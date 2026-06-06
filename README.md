# Snow Editor

Markdown and Org-mode editor with live preview. Local drafts in `localStorage`. Shared docs via link + SQLite backend.

Pablo Murad — pablomurad@pm.me

## Requirements

- Node.js 22.5+
- Docker + Compose (optional)

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend: http://localhost:41737
- API: http://localhost:41738/api/health
- DB file: `./data/snow.db`

## Local dev

Terminal 1:

```bash
npm install
npm run dev
```

Terminal 2:

```bash
cd backend && npm install && npm run dev
```

Vite proxies `/api` to port 41738.

```bash
npm run build
npm run preview
```

## Tests

```bash
cd backend && npm test
npm test
```

## Config

See `.env.example`. Main vars:

- `SHARE_ALLOWED_ORIGINS` — who may `POST /api/documents` (default includes localhost:41737)
- `VITE_PUBLIC_ORIGIN` — base URL for share links
- `VITE_ALLOW_SEARCH_INDEXING` — `true`/`false` (rebuild after change)
- `DATABASE_PATH` — SQLite path

## Routes

- `/` — local editor
- `/v/:token` — read-only shared view
- `/e/:token` — shared edit (lock required to save)

Share from `/`: pick title and expiry, get view + edit URLs.

`POST /api/documents` needs a browser `Origin` on the allowlist. No origin → 403.

Edit lock: one editor per doc, 2 min TTL, refreshed every 30s while tab is open.

## API

```
GET    /api/health
POST   /api/documents
GET    /api/documents/view/:token
GET    /api/documents/edit/:token
POST   /api/documents/edit/:token/lock
POST   /api/documents/edit/:token/lock/refresh
DELETE /api/documents/edit/:token/lock
PUT    /api/documents/edit/:token
GET    /api/documents/edit/:token/versions?clientId=&lockToken=
POST   /api/documents/edit/:token/versions/:versionId/restore
```

Limits: 60 req/min per IP on `/api`, 10 req/min on `POST /api/documents`, 1 MB max body.

Health returns `{ ok, db, uptime, version }`. DB down → 503.

## Stack

React, Vite, Express, SQLite (`node:sqlite`), marked, Orga, CodeMirror 6, DOMPurify.

## Org-mode

Parser: Orga. Editor: CodeMirror (highlight, fold, checklist toggle, outline on wide screens).

Works: headings, lists, tables, TODO keywords, SRC/QUOTE blocks, basic inline markup, `#+TITLE`.

Does not work: babel, agenda, LaTeX, full Emacs export. Not a replacement for Emacs.

## Backup

Manual only. Stop backend first if copying live.

```bash
./scripts/backup-db.sh          # or backup-db.ps1
docker compose stop backend
./scripts/restore-db.sh <file>  # or restore-db.ps1 -Backup <file>
docker compose start backend
```

Or copy `data/snow.db` yourself.

## Notes

- No accounts. Edit links are capability tokens — anyone with the link can edit when unlocked.
- No realtime collab.
- Preview HTML is sanitized.
- Monitor production with `GET /api/health`.
- Rebuild Docker after changing `VITE_*` or `SHARE_ALLOWED_ORIGINS`.

## License

Use freely for personal projects and learning.
