#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Uso:
  bash scripts/install-server-safe.sh \
    --app-domain <IP_o_dominio> \
    --admin-email <correo_admin> \
    --admin-password <password_admin> \
    --db-password <password_db> \
    [--admin-name <nombre_admin>] \
    [--grafana-password <password_grafana>] \
    [--force]

Descripcion:
  Flujo recomendado para servidor nuevo.
  1) Genera .env con valores fijos.
  2) Reinicia volumenes para evitar mismatch de passwords.
  3) Levanta stack y provisiona admin.
EOF
}

APP_DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_NAME="Administrador Principal"
DB_PASSWORD=""
GRAFANA_PASSWORD=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-domain)
      APP_DOMAIN="${2:-}"
      shift 2
      ;;
    --admin-email)
      ADMIN_EMAIL="${2:-}"
      shift 2
      ;;
    --admin-password)
      ADMIN_PASSWORD="${2:-}"
      shift 2
      ;;
    --admin-name)
      ADMIN_NAME="${2:-}"
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="${2:-}"
      shift 2
      ;;
    --grafana-password)
      GRAFANA_PASSWORD="${2:-}"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: opcion no reconocida: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$APP_DOMAIN" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" || -z "$DB_PASSWORD" ]]; then
  echo "ERROR: faltan parametros obligatorios."
  usage
  exit 1
fi

if [[ -f ".env" && "$FORCE" -ne 1 ]]; then
  echo "ERROR: .env ya existe. Usa --force si quieres reemplazarlo."
  exit 1
fi

SETUP_CMD=(
  bash scripts/setup-env.sh
  --app-domain "$APP_DOMAIN"
  --admin-email "$ADMIN_EMAIL"
  --admin-password "$ADMIN_PASSWORD"
  --admin-name "$ADMIN_NAME"
  --db-password "$DB_PASSWORD"
  --force
)

if [[ -n "$GRAFANA_PASSWORD" ]]; then
  SETUP_CMD+=(--grafana-password "$GRAFANA_PASSWORD")
fi

"${SETUP_CMD[@]}"

bash scripts/deploy-safe.sh \
  --fresh-db \
  --ensure-admin \
  --admin-email "$ADMIN_EMAIL" \
  --admin-password "$ADMIN_PASSWORD" \
  --admin-name "$ADMIN_NAME"
