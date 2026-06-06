#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${ROOT}/data/snow.db"
BACKUP_DIR="${ROOT}/data/backups"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-filename-or-path>" >&2
  echo "Example: $0 snow-2026-06-03-120000.db" >&2
  exit 1
fi

SOURCE="$1"
if [[ ! -f "$SOURCE" ]]; then
  SOURCE="${BACKUP_DIR}/$1"
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Backup not found: $SOURCE" >&2
  exit 1
fi

echo "This will overwrite ${DB} with:"
echo "  ${SOURCE}"
echo "Stop the backend first: docker compose stop backend"
read -r -p "Type RESTORE to continue: " CONFIRM

if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

mkdir -p "$(dirname "$DB")"
cp "$SOURCE" "$DB"
echo "Database restored from $SOURCE"
