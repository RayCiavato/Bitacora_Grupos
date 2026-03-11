#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ".env" ]]; then
  echo "Falta archivo .env en la raiz del proyecto."
  exit 1
fi

set -a
source .env
set +a

POSTGRES_USER="${POSTGRES_USER:-bitacora_user}"
POSTGRES_DB="${POSTGRES_DB:-bitacora}"

echo "Aplicando migracion de campos de bitacora..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/002_upgrade_events_fields.sql
echo "Migracion aplicada."

