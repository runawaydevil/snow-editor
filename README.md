# Snow Editor — Markdown Cozy

**Version:** 0.0.1  
**Creator:** Pablo Murad — [pablomurad@pm.me](mailto:pablomurad@pm.me)

A cozy online editor inspired by snow and calm reading. Write in **Markdown** or experimental **Org-mode** in one panel and see the live preview in the other. No backend, no login — everything runs in the browser.

## Features

- Real-time editor with side-by-side preview
- **Markdown** (full) and **Org-mode** (experimental, basic parser)
- Mode switch saved in `localStorage`
- Separate drafts per mode (autosave, debounced)
- **Clear** — start a blank document (instant when still on the default starter text)
- Save as `.md` or `.org`
- Import `.md`, `.markdown`, `.org`, `.txt`
- Long-document friendly: deferred preview, debounced storage, lazy `marked` load
- Production Docker image: nginx serving static build (compact)
- Word and character counters in both modes
- Preview HTML sanitized with [DOMPurify](https://github.com/cure53/DOMPurify)

## Editing modes

Use the **Markdown** / **Org-mode** switch below the subtitle.

| Mode | Preview | Save |
|------|---------|------|
| Markdown | `marked` | `document.md` |
| Org-mode | Custom parser (`src/lib/parseOrgMode.js`) | `document.org` |

### Browser storage keys

| Key | Purpose |
|-----|---------|
| `editor_mode` | Last selected mode |
| `snow_editor_markdown_content` | Markdown draft |
| `snow_editor_org_content` | Org-mode draft |

Legacy key `cozy-markdown-editor-content` is migrated once into `snow_editor_markdown_content`.

### Org-mode (partial support)

Supported in the experimental parser:

- Headings `*` … `****` with optional **TODO** / **DONE** badges
- Simple lists (`-`, `+`)
- Bold `*text*`, italic `/text/`, inline code `~code~` and `=code=`
- Links `[[url][label]]` and `[[url]]`
- Blocks `#+BEGIN_SRC` / `#+END_SRC` and `#+BEGIN_QUOTE` / `#+END_QUOTE`

Not supported yet: agenda, tables, properties, drawers, advanced blocks, PDF export.

## Stack

- React + Vite
- [marked](https://marked.js.org/) — Markdown to HTML
- Custom Org parser — lightweight JavaScript
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization
- Plain CSS (cozy / snow theme)

## Prerequisites

- **Local:** Node.js 18 or newer
- **Docker (optional):** Docker and Docker Compose

## Environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ALLOWED_HOSTS` | Hostnames for Vite dev/preview (e.g. `snow.pablomurad.com,localhost`) |

## Local installation

```bash
npm install
cp .env.example .env
```

## Run without Docker

```bash
npm run dev
```

Open: **http://localhost:41737**

```bash
npm run build
npm run preview
```

## Pre-deploy checklist (production)

1. Commit all sources under `src/` (including `src/lib/`).
2. Local smoke test: `npm run build` then `npm run preview`.
3. For **local dev** behind a custom host: `cp .env.example .env` and set `ALLOWED_HOSTS`.
4. Deploy: `docker compose up -d --build` (nginx serves static `dist/` on port **41737**).
5. Verify **http://localhost:41737** (or your public URL) — editor, both modes, save/import, Clear.

Production Docker uses **nginx:alpine** (lightweight). It does not need `ALLOWED_HOSTS` — any hostname works for static files.

## Run with Docker

```bash
docker compose up -d --build
```

Open: **http://localhost:41737**

Port **41737** (`41737:41737` in `docker-compose.yml`).

## Editor actions

### Clear

1. Click **Clear**
2. If the editor still shows the default starter for the current mode, it clears immediately
3. Otherwise confirm, then you get a **blank** document (persisted on reload)

Default starter text appears only on first visit per mode (or after you delete storage). To get the sample again, clear browser storage for the site or paste the sample manually.

### Save

- **Markdown:** **Save .md** → `document.md`
- **Org-mode:** **Save .org** → `document.org`

### Import

| Extension | Mode after import |
|-----------|-------------------|
| `.md`, `.markdown` | Markdown |
| `.org` | Org-mode |
| `.txt` | Keeps current mode |

## Long documents

- Editor and preview scroll independently
- Preview uses `useDeferredValue`
- Autosave debounced (500ms)
- If storage quota is exceeded, a footer warning appears — use **Save .md** / **Save .org**

## Security

Content is converted to HTML (`marked` or `parseOrgMode`), then `DOMPurify.sanitize()` before preview. User text is escaped in the Org parser before tags are applied.

## Project structure

```
├── Dockerfile
├── nginx.conf
├── vite.config.js
├── vite.preview.config.js
├── vite.shared.js
├── public/
│   ├── favicon.png
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    └── lib/
        ├── editorConstants.js
        ├── parseOrgMode.js
        └── previewHtml.js
```

## License

Free to use for personal projects and learning.
