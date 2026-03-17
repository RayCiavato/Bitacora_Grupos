#!/usr/bin/env bash

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "ERROR: Docker Compose no esta disponible en este servidor."
  echo "Instala plugin: sudo apt install -y docker-compose-plugin"
  echo "O instala legacy: sudo apt install -y docker-compose"
  return 1
}
