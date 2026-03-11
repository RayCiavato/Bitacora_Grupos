#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ".env" ]]; then
  echo "Falta archivo .env en la raiz del proyecto."
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Uso: ./scripts/restore-db.sh <ruta_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe el backup: $BACKUP_FILE"
  exit 1
fi

set -a
source .env
set +a

echo "Restaurando backup: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restore completado."

