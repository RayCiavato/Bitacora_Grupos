# Bitacora (Docker + Seguridad + Observabilidad)

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_gestor_tareas.git

Guia principal de despliegue:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

Guia de hardening:
- [HARDENING_PASO_A_PASO_NOVATOS.md](HARDENING_PASO_A_PASO_NOVATOS.md)

Guia HTTPS interno con CA propia:
- [docs/HTTPS_INTERNO_CA.md](docs/HTTPS_INTERNO_CA.md)

---

## Credenciales iniciales

- Admin email: `admin@n1njahack.local`
- Admin password: definir en el servidor, no se publica en GitHub.
- DB password: definir en el servidor, no se publica en GitHub.
- Grafana user: `admin`
- Grafana password: definir en el servidor, no se publica en GitHub.

Usa passwords fuertes y guardalos solo en el `.env` del servidor o en tu gestor de secretos.

---

## Despliegue rapido recomendado

```bash
cd ~/apps/Bitacora_gestor_tareas
chmod +x scripts/*.sh

read -r -s -p "Admin password inicial: " ADMIN_PASSWORD; echo
read -r -s -p "DB password: " DB_PASSWORD; echo
read -r -s -p "Grafana password: " GRAFANA_PASSWORD; echo

bash scripts/install-server-safe.sh \
  --app-domain 10.156.99.35 \
  --admin-email admin@n1njahack.local \
  --admin-password "$ADMIN_PASSWORD" \
  --db-password "$DB_PASSWORD" \
  --grafana-password "$GRAFANA_PASSWORD" \
  --force
```

Verifica:

```bash
docker compose ps
docker compose logs --tail=120 app
curl -I http://127.0.0.1
```

---

## Actualizacion segura (sin romper)

```bash
cd ~/apps/Bitacora_gestor_tareas

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

git config core.filemode false
git fetch origin main

# Si hay cambios locales (por ejemplo Caddyfile interno), guardalos sin perderlos.
if [ -n "$(git status --porcelain)" ]; then
  mkdir -p ~/bitacora-backups
  [ -f infra/Caddyfile.internal-https ] && cp infra/Caddyfile.internal-https ~/bitacora-backups/Caddyfile.internal-https.$(date +%Y%m%d-%H%M%S).bak
  git stash push -u -m "pre-update-$(date +%F-%H%M%S)"
fi

git checkout main
git pull --ff-only origin main

docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app

$DC ps app
curl -sS http://127.0.0.1/health
```

---

## Telegram interactivo sin dominio publico

Para usar `/menu`, botones inline y `/buscar` dentro de un grupo privado sin HTTPS ni dominio publico,
activa long polling en el `.env` del servidor:

> Seguridad: el token real del bot no se sube a GitHub. Guardalo solo en `.env` del servidor.

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=REEMPLAZAR_TOKEN
TELEGRAM_CHAT_ID=REEMPLAZAR_CHAT_ID
TELEGRAM_BOT_INTERACTIVE_ENABLED=true
TELEGRAM_BOT_MODE=polling
TELEGRAM_POLLING_TIMEOUT=30
TELEGRAM_POLLING_INTERVAL_MS=1000
TELEGRAM_POLLING_ALLOWED_UPDATES=message,callback_query
```

Antes de iniciar polling, elimina cualquier webhook previo:

```bash
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

En modo `polling`, ejecuta una sola instancia de `app` para evitar doble lectura de updates.
El modo `webhook` sigue disponible para un futuro dominio HTTPS usando `TELEGRAM_BOT_MODE=webhook`.

### Cargar token y chat ID en un servidor existente

```bash
cd ~/apps/Bitacora_gestor_tareas

unset TELEGRAM_BOT_TOKEN_VALUE TELEGRAM_CHAT_ID_VALUE
read -r -s -p "Pega token Telegram: " TELEGRAM_BOT_TOKEN_VALUE; echo
read -r -p "Pega chat id Telegram: " TELEGRAM_CHAT_ID_VALUE

export TELEGRAM_BOT_TOKEN_VALUE="$(printf '%s' "$TELEGRAM_BOT_TOKEN_VALUE" | tr -cd 'A-Za-z0-9_:-')"
export TELEGRAM_CHAT_ID_VALUE="$(printf '%s' "$TELEGRAM_CHAT_ID_VALUE" | tr -cd '0-9-')"

python3 - <<'PY'
import os
from pathlib import Path

env_path = Path(".env")
values = {
    "TELEGRAM_ENABLED": "true",
    "TELEGRAM_BOT_TOKEN": os.environ["TELEGRAM_BOT_TOKEN_VALUE"],
    "TELEGRAM_CHAT_ID": os.environ["TELEGRAM_CHAT_ID_VALUE"],
    "TELEGRAM_BOT_INTERACTIVE_ENABLED": "true",
    "TELEGRAM_BOT_MODE": "polling",
    "TELEGRAM_POLLING_TIMEOUT": "30",
    "TELEGRAM_POLLING_INTERVAL_MS": "1000",
    "TELEGRAM_POLLING_ALLOWED_UPDATES": "message,callback_query",
}
lines = env_path.read_text().splitlines() if env_path.exists() else []
out, seen = [], set()
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else None
    if key in values:
        out.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in values.items():
    if key not in seen:
        out.append(f"{key}={value}")
env_path.write_text("\n".join(out) + "\n")
PY

curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_VALUE}/deleteWebhook?drop_pending_updates=false"
```

Despues de iniciar sesion en la web, ve a **Configuracion > Telegram** para generar el codigo de vinculacion o desvincular el dispositivo actual.
El sistema genera el codigo temporal y te muestra el comando `/start CODIGO` para pegarlo en Telegram.
