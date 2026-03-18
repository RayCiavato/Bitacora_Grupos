#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/compose.sh
source "$ROOT_DIR/scripts/lib/compose.sh"
detect_compose_cmd

usage() {
  cat <<'EOF'
Uso:
  bash scripts/deploy-safe.sh [opciones]

Opciones:
  --pull                   Ejecuta git pull --ff-only origin <branch>.
  --branch <nombre>        Rama para --pull (default: main).
  --fresh-db               Reinicia stack con Compose down -v.
  --ensure-admin           Ejecuta scripts/provision-admin.sh al final.
  --admin-email <correo>   Correo para --ensure-admin (default: ADMIN_DEFAULT_EMAIL de .env).
  --admin-password <pass>  Password para --ensure-admin (default: ADMIN_DEFAULT_PASSWORD de .env).
  --admin-name <nombre>    Nombre para --ensure-admin (default: Administrador Principal).
  --no-build               Levanta stack sin --build.
  -h, --help               Muestra ayuda.
EOF
}

PULL=0
BRANCH="main"
FRESH_DB=0
ENSURE_ADMIN=0
NO_BUILD=0
ADMIN_EMAIL_ARG=""
ADMIN_PASSWORD_ARG=""
ADMIN_NAME_ARG="Administrador Principal"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull)
      PULL=1
      shift
      ;;
    --branch)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --branch requiere valor."
        exit 1
      }
      BRANCH="$2"
      shift 2
      ;;
    --fresh-db)
      FRESH_DB=1
      shift
      ;;
    --ensure-admin)
      ENSURE_ADMIN=1
      shift
      ;;
    --admin-email)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-email requiere valor."
        exit 1
      }
      ADMIN_EMAIL_ARG="$2"
      shift 2
      ;;
    --admin-password)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-password requiere valor."
        exit 1
      }
      ADMIN_PASSWORD_ARG="$2"
      shift 2
      ;;
    --admin-name)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --admin-name requiere valor."
        exit 1
      }
      ADMIN_NAME_ARG="$2"
      shift 2
      ;;
    --no-build)
      NO_BUILD=1
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

if [[ ! -f ".env" ]]; then
  echo "ERROR: falta .env. Ejecuta primero:"
  echo "  bash scripts/setup-env.sh --app-domain <IP_o_dominio> --admin-email <correo> --admin-password '<pass>' --db-password '<pass>' --force"
  exit 1
fi

required_vars=(
  APP_DOMAIN
  CADDY_PROFILE
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  JWT_SECRET
  ADMIN_DEFAULT_EMAIL
  ADMIN_DEFAULT_PASSWORD
  GRAFANA_ADMIN_PASSWORD
  COOKIE_SECURE
)

for key in "${required_vars[@]}"; do
  if ! grep -Eq "^${key}=.+" .env; then
    echo "ERROR: variable ${key} vacia en .env"
    exit 1
  fi
done

if [[ "$PULL" -eq 1 ]]; then
  git update-index -q --refresh
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: hay cambios locales en el repositorio. Evito git pull para no romper despliegue."
    git status --short
    echo
    echo "Opciones:"
    echo "  - Restaurar archivo puntual: git restore <archivo>"
    echo "  - Guardar temporalmente:     git stash push -m 'server-local'"
    exit 1
  fi

  git pull --ff-only origin "$BRANCH"
fi

if [[ "$FRESH_DB" -eq 1 ]]; then
  "${COMPOSE_CMD[@]}" down -v
fi

is_legacy_compose() {
  [[ "${COMPOSE_CMD[0]}" == "docker-compose" ]]
}

compose_up_stack() {
  if [[ "$NO_BUILD" -eq 1 ]]; then
    "${COMPOSE_CMD[@]}" up -d
  else
    "${COMPOSE_CMD[@]}" up -d --build
  fi
}

if ! compose_up_stack; then
  if is_legacy_compose; then
    echo "WARN: fallo de recreate detectado en docker-compose legacy. Aplicando workaround seguro..."
    "${COMPOSE_CMD[@]}" rm -f -s app >/dev/null 2>&1 || true
    "${COMPOSE_CMD[@]}" down --remove-orphans >/dev/null 2>&1 || true
    compose_up_stack
  else
    echo "ERROR: fallo en deploy con Compose."
    exit 1
  fi
fi

for _ in {1..90}; do
  if [[ "$(docker inspect -f '{{.State.Health.Status}}' bitacora-postgres 2>/dev/null || true)" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$ENSURE_ADMIN" -eq 1 ]]; then
  ADMIN_EMAIL="${ADMIN_EMAIL_ARG:-$(grep '^ADMIN_DEFAULT_EMAIL=' .env | cut -d= -f2-)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD_ARG:-$(grep '^ADMIN_DEFAULT_PASSWORD=' .env | cut -d= -f2-)}"
  bash scripts/provision-admin.sh "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME_ARG"
fi

"${COMPOSE_CMD[@]}" ps
"${COMPOSE_CMD[@]}" logs --tail=120 app
