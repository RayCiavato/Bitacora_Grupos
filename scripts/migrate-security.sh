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

echo "Aplicando migracion de seguridad (token_version)..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/003_add_token_version.sql
echo "Migracion de seguridad aplicada."

