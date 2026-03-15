#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "ERROR: falta .env. Ejecuta primero:"
  echo "  bash scripts/setup-env.sh --app-domain <IP_o_dominio> --admin-email <correo>"
  exit 1
fi

required_vars=(
  APP_DOMAIN
  CADDY_PROFILE
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  JWT_SECRET
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

if [[ "${1:-}" == "--pull" ]]; then
  git pull origin main
fi

docker compose up -d --build
docker compose ps
docker compose logs --tail=80 app

