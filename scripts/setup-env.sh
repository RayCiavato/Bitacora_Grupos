#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  bash scripts/setup-env.sh [opciones]

Opciones:
  --force                    Sobrescribe .env si ya existe.
  --env-file <ruta>          Ruta de salida del archivo env (default: .env).
  --app-domain <dominio/ip>  Dominio o IP para APP_DOMAIN.
  --admin-email <correo>     Correo del admin inicial.
  --admin-name <nombre>      Nombre del admin inicial.
  --admin-password <valor>   Password del admin (si no se indica, se genera).
  --db-password <valor>      Password de PostgreSQL (usar URL-safe: A-Za-z0-9_-).
  --grafana-password <valor> Password de Grafana (si no se indica, se genera).
  --telegram-enabled <bool>  Habilita/inhabilita Telegram (true|false).
  --telegram-bot-token <v>   Token del bot Telegram.
  --telegram-chat-id <v>     Chat ID destino para alertas.
  --telegram-alert-cron <v>  Cron para alertas de vencimiento Telegram.
  --telegram-interactive-enabled <bool>  Habilita panel interactivo Telegram (true|false).
  --telegram-webhook-secret <v>          Secreto de webhook Telegram (header).
  -h, --help                 Muestra esta ayuda.
EOF
}

ENV_FILE=".env"
FORCE=0
APP_DOMAIN_OVERRIDE=""
ADMIN_EMAIL_OVERRIDE="admin@bitacora.local"
ADMIN_NAME_OVERRIDE="Administrador"
ADMIN_PASSWORD_OVERRIDE=""
DB_PASSWORD_OVERRIDE=""
GRAFANA_PASSWORD_OVERRIDE=""
TELEGRAM_ENABLED_OVERRIDE=""
TELEGRAM_BOT_TOKEN_OVERRIDE=""
TELEGRAM_CHAT_ID_OVERRIDE=""
TELEGRAM_ALERT_CRON_OVERRIDE=""
TELEGRAM_INTERACTIVE_ENABLED_OVERRIDE=""
TELEGRAM_WEBHOOK_SECRET_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    --env-file)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --env-file requiere un valor."
        exit 1
      }
      ENV_FILE="$2"
      shift 2
      ;;
    --app-domain)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --app-domain requiere un valor."
        exit 1
      }
      APP_DOMAIN_OVERRIDE="$2"
      shift 2
      ;;
    --admin-email)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-email requiere un valor."
        exit 1
      }
      ADMIN_EMAIL_OVERRIDE="$2"
      shift 2
      ;;
    --admin-name)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-name requiere un valor."
        exit 1
      }
      ADMIN_NAME_OVERRIDE="$2"
      shift 2
      ;;
    --admin-password)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-password requiere un valor."
        exit 1
      }
      ADMIN_PASSWORD_OVERRIDE="$2"
      shift 2
      ;;
    --db-password)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --db-password requiere un valor."
        exit 1
      }
      DB_PASSWORD_OVERRIDE="$2"
      shift 2
      ;;
    --grafana-password)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --grafana-password requiere un valor."
        exit 1
      }
      GRAFANA_PASSWORD_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-enabled)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-enabled requiere un valor."
        exit 1
      }
      TELEGRAM_ENABLED_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-bot-token)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-bot-token requiere un valor."
        exit 1
      }
      TELEGRAM_BOT_TOKEN_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-chat-id)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-chat-id requiere un valor."
        exit 1
      }
      TELEGRAM_CHAT_ID_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-alert-cron)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-alert-cron requiere un valor."
        exit 1
      }
      TELEGRAM_ALERT_CRON_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-interactive-enabled)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-interactive-enabled requiere un valor."
        exit 1
      }
      TELEGRAM_INTERACTIVE_ENABLED_OVERRIDE="$2"
      shift 2
      ;;
    --telegram-webhook-secret)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --telegram-webhook-secret requiere un valor."
        exit 1
      }
      TELEGRAM_WEBHOOK_SECRET_OVERRIDE="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: parametro no reconocido: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f ".env.example" ]]; then
  echo "ERROR: no existe .env.example en la raiz del proyecto."
  exit 1
fi

if [[ -f "$ENV_FILE" && "$FORCE" -ne 1 ]]; then
  echo "ERROR: $ENV_FILE ya existe. Usa --force para sobrescribir."
  exit 1
fi

detect_primary_ip() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    ip="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++){if($i=="src"){print $(i+1); exit}}}')"
  fi

  if [[ -z "$ip" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi

  if [[ -z "$ip" ]]; then
    ip="localhost"
  fi

  printf '%s' "$ip"
}

is_ip_or_local_target() {
  local target="$1"
  if [[ "$target" == "localhost" || "$target" == "127.0.0.1" ]]; then
    return 0
  fi

  if [[ "$target" == *:* ]]; then
    # IPv6 o target con puerto.
    return 0
  fi

  [[ "$target" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

random_string() {
  local length="$1"
  generate_chars 'A-Za-z0-9' "$length"
}

generate_chars() {
  local charset="$1"
  local length="$2"
  local output=""

  while ((${#output} < length)); do
    output+="$(
      LC_ALL=C dd if=/dev/urandom bs=1024 count=1 2>/dev/null | tr -dc "$charset"
    )"
  done

  printf '%s' "${output:0:length}"
}

maybe_shuffle() {
  local value="$1"
  if command -v shuf >/dev/null 2>&1; then
    printf '%s' "$value" | fold -w1 | shuf | tr -d '\n'
    return
  fi
  printf '%s' "$value"
}

generate_password() {
  local length="${1:-20}"
  local upper lower digit special rest_len rest merged

  if [[ "$length" -lt 12 ]]; then
    length=12
  fi

  upper="$(generate_chars 'A-Z' 1)"
  lower="$(generate_chars 'a-z' 1)"
  digit="$(generate_chars '0-9' 1)"
  special="$(generate_chars '!@#%^*_=+-' 1)"
  rest_len=$((length - 4))
  rest="$(generate_chars 'A-Za-z0-9!@#%^*_=+-' "$rest_len")"
  merged="${upper}${lower}${digit}${special}${rest}"

  maybe_shuffle "$merged"
}

generate_db_password() {
  local length="${1:-24}"
  local upper lower digit rest_len rest merged

  if [[ "$length" -lt 12 ]]; then
    length=12
  fi

  upper="$(generate_chars 'A-Z' 1)"
  lower="$(generate_chars 'a-z' 1)"
  digit="$(generate_chars '0-9' 1)"
  rest_len=$((length - 3))
  rest="$(generate_chars 'A-Za-z0-9_-' "$rest_len")"
  merged="${upper}${lower}${digit}${rest}"

  maybe_shuffle "$merged"
}

set_env_value() {
  local key="$1"
  local value="$2"
  local escaped

  escaped="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s/^${key}=.*/${key}=${escaped}/" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

cp .env.example "$ENV_FILE"

APP_DOMAIN_VALUE="${APP_DOMAIN_OVERRIDE:-$(detect_primary_ip)}"
POSTGRES_PASSWORD_VALUE="${DB_PASSWORD_OVERRIDE:-$(generate_db_password 24)}"
JWT_SECRET_VALUE="$(random_string 64)"
ADMIN_PASSWORD_VALUE="${ADMIN_PASSWORD_OVERRIDE:-$(generate_password 24)}"
GRAFANA_PASSWORD_VALUE="${GRAFANA_PASSWORD_OVERRIDE:-$(generate_password 24)}"
TELEGRAM_ENABLED_VALUE="${TELEGRAM_ENABLED_OVERRIDE:-false}"
TELEGRAM_ALERT_CRON_VALUE="${TELEGRAM_ALERT_CRON_OVERRIDE:-*/15 * * * *}"
TELEGRAM_INTERACTIVE_ENABLED_VALUE="${TELEGRAM_INTERACTIVE_ENABLED_OVERRIDE:-false}"
TELEGRAM_WEBHOOK_SECRET_VALUE="${TELEGRAM_WEBHOOK_SECRET_OVERRIDE:-}"

if [[ "$TELEGRAM_ENABLED_VALUE" != "true" && "$TELEGRAM_ENABLED_VALUE" != "false" ]]; then
  echo "ERROR: --telegram-enabled debe ser true o false."
  exit 1
fi

if [[ "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" != "true" && "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" != "false" ]]; then
  echo "ERROR: --telegram-interactive-enabled debe ser true o false."
  exit 1
fi

if [[ "$TELEGRAM_ENABLED_VALUE" == "true" ]]; then
  if [[ -z "$TELEGRAM_BOT_TOKEN_OVERRIDE" || -z "$TELEGRAM_CHAT_ID_OVERRIDE" ]]; then
    echo "ERROR: para habilitar Telegram debes indicar --telegram-bot-token y --telegram-chat-id."
    exit 1
  fi
fi

if [[ "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" == "true" && "$TELEGRAM_ENABLED_VALUE" != "true" ]]; then
  echo "ERROR: --telegram-interactive-enabled true requiere --telegram-enabled true."
  exit 1
fi

if [[ "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" == "true" && -z "$TELEGRAM_WEBHOOK_SECRET_VALUE" ]]; then
  TELEGRAM_WEBHOOK_SECRET_VALUE="$(random_string 48)"
fi

if is_ip_or_local_target "$APP_DOMAIN_VALUE"; then
  CADDY_PROFILE_VALUE="http"
  COOKIE_SECURE_VALUE="false"
else
  CADDY_PROFILE_VALUE="https"
  COOKIE_SECURE_VALUE="true"
fi

set_env_value "APP_DOMAIN" "$APP_DOMAIN_VALUE"
set_env_value "POSTGRES_DB" "bitacora"
set_env_value "POSTGRES_USER" "bitacora_user"
set_env_value "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD_VALUE"
set_env_value "JWT_SECRET" "$JWT_SECRET_VALUE"
set_env_value "ACCESS_TOKEN_EXPIRES_IN" "15m"
set_env_value "REFRESH_TOKEN_EXPIRES_IN" "7d"
set_env_value "AUTH_COOKIE_NAME" "bitacora_access"
set_env_value "REFRESH_COOKIE_NAME" "bitacora_refresh"
set_env_value "CADDY_PROFILE" "$CADDY_PROFILE_VALUE"
set_env_value "COOKIE_SECURE" "$COOKIE_SECURE_VALUE"
set_env_value "COOKIE_SAMESITE" "strict"
set_env_value "ADMIN_DEFAULT_NAME" "$ADMIN_NAME_OVERRIDE"
set_env_value "ADMIN_DEFAULT_EMAIL" "$ADMIN_EMAIL_OVERRIDE"
set_env_value "ADMIN_DEFAULT_PASSWORD" "$ADMIN_PASSWORD_VALUE"
set_env_value "MFA_REQUIRED" "true"
set_env_value "ALLOW_PUBLIC_REGISTRATION" "true"
set_env_value "UPLOAD_DIR" "/usr/src/app/uploads"
set_env_value "UPLOAD_MAX_BYTES" "10485760"
set_env_value "REMINDER_ENABLED" "false"
set_env_value "GRAFANA_ADMIN_USER" "admin"
set_env_value "GRAFANA_ADMIN_PASSWORD" "$GRAFANA_PASSWORD_VALUE"
set_env_value "TELEGRAM_ENABLED" "$TELEGRAM_ENABLED_VALUE"
set_env_value "TELEGRAM_TASK_ALERT_CRON" "$TELEGRAM_ALERT_CRON_VALUE"
set_env_value "TELEGRAM_BOT_INTERACTIVE_ENABLED" "$TELEGRAM_INTERACTIVE_ENABLED_VALUE"

if [[ -n "$TELEGRAM_BOT_TOKEN_OVERRIDE" ]]; then
  set_env_value "TELEGRAM_BOT_TOKEN" "$TELEGRAM_BOT_TOKEN_OVERRIDE"
fi

if [[ -n "$TELEGRAM_CHAT_ID_OVERRIDE" ]]; then
  set_env_value "TELEGRAM_CHAT_ID" "$TELEGRAM_CHAT_ID_OVERRIDE"
fi

if [[ "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" == "true" ]]; then
  set_env_value "TELEGRAM_BOT_WEBHOOK_SECRET" "$TELEGRAM_WEBHOOK_SECRET_VALUE"
fi

chmod 600 "$ENV_FILE" || true

NEXT_COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    NEXT_COMPOSE_CMD="docker-compose"
  fi
fi

cat <<EOF
$ENV_FILE generado correctamente.

Valores configurados:
- APP_DOMAIN: $APP_DOMAIN_VALUE
- CADDY_PROFILE: $CADDY_PROFILE_VALUE
- COOKIE_SECURE: $COOKIE_SECURE_VALUE
- ADMIN_DEFAULT_EMAIL: $ADMIN_EMAIL_OVERRIDE
- ADMIN_DEFAULT_PASSWORD: $ADMIN_PASSWORD_VALUE
- POSTGRES_USER: bitacora_user
- POSTGRES_PASSWORD: $POSTGRES_PASSWORD_VALUE
- GRAFANA_ADMIN_USER: admin
- GRAFANA_ADMIN_PASSWORD: $GRAFANA_PASSWORD_VALUE
- TELEGRAM_ENABLED: $TELEGRAM_ENABLED_VALUE
- TELEGRAM_TASK_ALERT_CRON: $TELEGRAM_ALERT_CRON_VALUE
- TELEGRAM_BOT_INTERACTIVE_ENABLED: $TELEGRAM_INTERACTIVE_ENABLED_VALUE

$(if [[ "$TELEGRAM_ENABLED_VALUE" == "true" ]]; then printf '%s\n' "- TELEGRAM_CHAT_ID: $TELEGRAM_CHAT_ID_OVERRIDE"; fi)
$(if [[ "$TELEGRAM_INTERACTIVE_ENABLED_VALUE" == "true" ]]; then printf '%s\n' "- TELEGRAM_BOT_WEBHOOK_SECRET: [generado/establecido]"; fi)

Siguiente paso:
  $NEXT_COMPOSE_CMD up -d --build
EOF
