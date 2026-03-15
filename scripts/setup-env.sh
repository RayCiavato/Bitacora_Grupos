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

set_env_value "APP_DOMAIN" "$APP_DOMAIN_VALUE"
set_env_value "POSTGRES_DB" "bitacora"
set_env_value "POSTGRES_USER" "bitacora_user"
set_env_value "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD_VALUE"
set_env_value "JWT_SECRET" "$JWT_SECRET_VALUE"
set_env_value "ACCESS_TOKEN_EXPIRES_IN" "15m"
set_env_value "REFRESH_TOKEN_EXPIRES_IN" "7d"
set_env_value "AUTH_COOKIE_NAME" "bitacora_access"
set_env_value "REFRESH_COOKIE_NAME" "bitacora_refresh"
set_env_value "COOKIE_SECURE" "true"
set_env_value "COOKIE_SAMESITE" "strict"
set_env_value "ADMIN_DEFAULT_NAME" "$ADMIN_NAME_OVERRIDE"
set_env_value "ADMIN_DEFAULT_EMAIL" "$ADMIN_EMAIL_OVERRIDE"
set_env_value "ADMIN_DEFAULT_PASSWORD" "$ADMIN_PASSWORD_VALUE"
set_env_value "MFA_REQUIRED" "false"
set_env_value "ALLOW_PUBLIC_REGISTRATION" "false"
set_env_value "UPLOAD_DIR" "/usr/src/app/uploads"
set_env_value "UPLOAD_MAX_BYTES" "10485760"
set_env_value "REMINDER_ENABLED" "false"
set_env_value "GRAFANA_ADMIN_USER" "admin"
set_env_value "GRAFANA_ADMIN_PASSWORD" "$GRAFANA_PASSWORD_VALUE"

chmod 600 "$ENV_FILE" || true

cat <<EOF
$ENV_FILE generado correctamente.

Valores configurados:
- APP_DOMAIN: $APP_DOMAIN_VALUE
- ADMIN_DEFAULT_EMAIL: $ADMIN_EMAIL_OVERRIDE
- ADMIN_DEFAULT_PASSWORD: $ADMIN_PASSWORD_VALUE
- POSTGRES_USER: bitacora_user
- POSTGRES_PASSWORD: $POSTGRES_PASSWORD_VALUE
- GRAFANA_ADMIN_USER: admin
- GRAFANA_ADMIN_PASSWORD: $GRAFANA_PASSWORD_VALUE

Siguiente paso:
  docker compose up -d --build
EOF
