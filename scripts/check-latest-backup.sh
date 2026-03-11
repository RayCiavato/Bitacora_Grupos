#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="backups"
MAX_AGE_SECONDS=$((48 * 60 * 60))

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "No existe el directorio $BACKUP_DIR"
  exit 2
fi

LATEST_FILE=$(find "$BACKUP_DIR" -type f -name "*.sql.gz" -printf "%T@ %p\n" | sort -nr | head -n1 | cut -d" " -f2- || true)
if [[ -z "$LATEST_FILE" ]]; then
  echo "No se encontraron backups en $BACKUP_DIR"
  exit 2
fi

NOW_EPOCH=$(date +%s)
FILE_EPOCH=$(stat -c %Y "$LATEST_FILE")
AGE=$((NOW_EPOCH - FILE_EPOCH))

if (( AGE > MAX_AGE_SECONDS )); then
  echo "Backup demasiado antiguo (${AGE}s): $LATEST_FILE"
  exit 1
fi

echo "Backup OK (${AGE}s): $LATEST_FILE"

