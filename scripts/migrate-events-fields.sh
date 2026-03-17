#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/compose.sh
source "$SCRIPT_DIR/lib/compose.sh"
detect_compose_cmd

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
"${COMPOSE_CMD[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/002_upgrade_events_fields.sql
echo "Migracion aplicada."

