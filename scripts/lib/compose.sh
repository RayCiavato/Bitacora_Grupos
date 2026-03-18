#!/usr/bin/env bash

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    local legacy_version
    legacy_version="$(docker-compose version --short 2>/dev/null || true)"
    if [[ "$legacy_version" =~ ^1\. ]]; then
      echo "ERROR: detectado docker-compose legacy v${legacy_version} (no soportado)."
      echo "Instala Docker Compose v2 (plugin) y usa: docker compose ..."
      echo "Referencia:"
      echo "  - docker compose version"
      echo "  - sudo apt-get install -y docker-compose-plugin"
      return 1
    fi

    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "ERROR: Docker Compose no esta disponible en este servidor."
  echo "Instala plugin: sudo apt install -y docker-compose-plugin"
  echo "Si tu repo no tiene ese paquete, instala Docker CE + plugin oficial."
  return 1
}
