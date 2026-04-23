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
    [--telegram-enabled true|false] \
    [--telegram-bot-token <token>] \
    [--telegram-chat-id <chat_id>] \
    [--telegram-alert-cron "<cron>"] \
    [--telegram-interactive-enabled true|false] \
    [--telegram-webhook-secret <secret>] \
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
TELEGRAM_ENABLED=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
TELEGRAM_ALERT_CRON=""
TELEGRAM_INTERACTIVE_ENABLED=""
TELEGRAM_WEBHOOK_SECRET=""
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
    --telegram-enabled)
      TELEGRAM_ENABLED="${2:-}"
      shift 2
      ;;
    --telegram-bot-token)
      TELEGRAM_BOT_TOKEN="${2:-}"
      shift 2
      ;;
    --telegram-chat-id)
      TELEGRAM_CHAT_ID="${2:-}"
      shift 2
      ;;
    --telegram-alert-cron)
      TELEGRAM_ALERT_CRON="${2:-}"
      shift 2
      ;;
    --telegram-interactive-enabled)
      TELEGRAM_INTERACTIVE_ENABLED="${2:-}"
      shift 2
      ;;
    --telegram-webhook-secret)
      TELEGRAM_WEBHOOK_SECRET="${2:-}"
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

if [[ -n "$TELEGRAM_ENABLED" && "$TELEGRAM_ENABLED" != "true" && "$TELEGRAM_ENABLED" != "false" ]]; then
  echo "ERROR: --telegram-enabled debe ser true o false."
  exit 1
fi

if [[ -n "$TELEGRAM_INTERACTIVE_ENABLED" && "$TELEGRAM_INTERACTIVE_ENABLED" != "true" && "$TELEGRAM_INTERACTIVE_ENABLED" != "false" ]]; then
  echo "ERROR: --telegram-interactive-enabled debe ser true o false."
  exit 1
fi

if [[ -n "$TELEGRAM_BOT_TOKEN" && -z "$TELEGRAM_CHAT_ID" ]]; then
  echo "ERROR: si defines --telegram-bot-token debes definir --telegram-chat-id."
  exit 1
fi

if [[ -n "$TELEGRAM_CHAT_ID" && -z "$TELEGRAM_BOT_TOKEN" ]]; then
  echo "ERROR: si defines --telegram-chat-id debes definir --telegram-bot-token."
  exit 1
fi

if [[ "$TELEGRAM_ENABLED" == "true" && ( -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ) ]]; then
  echo "ERROR: con --telegram-enabled true debes definir --telegram-bot-token y --telegram-chat-id."
  exit 1
fi

if [[ "$TELEGRAM_INTERACTIVE_ENABLED" == "true" && "$TELEGRAM_ENABLED" != "true" ]]; then
  echo "ERROR: --telegram-interactive-enabled true requiere --telegram-enabled true."
  exit 1
fi

if [[ -n "$TELEGRAM_WEBHOOK_SECRET" && "$TELEGRAM_INTERACTIVE_ENABLED" != "true" ]]; then
  echo "ERROR: --telegram-webhook-secret requiere --telegram-interactive-enabled true."
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

if [[ -n "$TELEGRAM_ENABLED" ]]; then
  SETUP_CMD+=(--telegram-enabled "$TELEGRAM_ENABLED")
fi

if [[ -n "$TELEGRAM_BOT_TOKEN" ]]; then
  SETUP_CMD+=(--telegram-bot-token "$TELEGRAM_BOT_TOKEN")
fi

if [[ -n "$TELEGRAM_CHAT_ID" ]]; then
  SETUP_CMD+=(--telegram-chat-id "$TELEGRAM_CHAT_ID")
fi

if [[ -n "$TELEGRAM_ALERT_CRON" ]]; then
  SETUP_CMD+=(--telegram-alert-cron "$TELEGRAM_ALERT_CRON")
fi

if [[ -n "$TELEGRAM_INTERACTIVE_ENABLED" ]]; then
  SETUP_CMD+=(--telegram-interactive-enabled "$TELEGRAM_INTERACTIVE_ENABLED")
fi

if [[ -n "$TELEGRAM_WEBHOOK_SECRET" ]]; then
  SETUP_CMD+=(--telegram-webhook-secret "$TELEGRAM_WEBHOOK_SECRET")
fi

"${SETUP_CMD[@]}"

bash scripts/deploy-safe.sh \
  --fresh-db \
  --ensure-admin \
  --admin-email "$ADMIN_EMAIL" \
  --admin-password "$ADMIN_PASSWORD" \
  --admin-name "$ADMIN_NAME"
