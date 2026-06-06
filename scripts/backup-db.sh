#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${ROOT}/data/snow.db"
BACKUP_DIR="${ROOT}/data/backups"

if [[ ! -f "$DB" ]]; then
  echo "Database not found: $DB" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
DEST="${BACKUP_DIR}/snow-${STAMP}.db"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '${DEST}'"
else
  echo "sqlite3 not found — copying file (stop the backend first for a safe copy)."
  cp "$DB" "$DEST"
fi

echo "Backup saved: $DEST"
