# Manual De Despliegue En Servidor Ubuntu (Bitacora Grupos)

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_Grupos.git

Ruta recomendada en servidor:
- `~/apps/Bitacora_Grupos`

---

## Modelo multi-area incluido

Esta version convierte Bitacora en una plataforma por grupos/areas:

- `General`: compatibilidad para datos historicos.
- `Soporte`
- `Infraestructura`
- `Seguridad Tecnologica`
- `Gerencia`

El backend aplica RBAC + ABAC:

1. Primero valida permiso del rol sobre el modulo.
2. Luego valida permiso de grupo sobre el recurso.
3. Si una condicion falla, se niega el acceso.

La migracion `db/migrations/008_groups_abac.sql`:
- crea `groups`, `user_groups`, `group_access_policies`
- agrega `group_id` a bitacoras, tareas y adjuntos
- asigna datos existentes a `General`
- configura politicas iniciales sin borrar data

No uses `docker compose down -v`, no borres volumenes y no ejecutes scripts `fresh-db` en servidores con data.

---

## 1) Credenciales iniciales seguras

Usa estos usuarios sugeridos y define las passwords en el servidor. Las passwords no se publican en GitHub.

- Admin email: `admin@n1njahack.local`
- Admin password: definir en el servidor.
- DB user: `bitacora_user`
- DB password: definir en el servidor.

Nota de registro: los usuarios nuevos creados desde la web o desde administracion solo aceptan correos `gmail.com` y `hotmail.com`. El admin inicial `admin@n1njahack.local` se mantiene como excepcion de provisioning por script.
- Grafana user: `admin`
- Grafana password: definir en el servidor.

Importante:
- La password admin debe cumplir complejidad (incluye mayuscula, minuscula, numero y especial).
- La password de DB conviene URL-safe (`A-Za-z0-9_-`) para evitar errores en `DATABASE_URL`.
- Guarda las credenciales solo en `.env` del servidor o en tu gestor de secretos.

### Opcion segura para no equivocarte tipeando passwords

No se deja una password fija en el repositorio. Si quieres evitar errores, deja que el servidor genere passwords temporales fuertes:

```bash
cd ~/apps/Bitacora_Grupos
chmod +x scripts/*.sh

bash scripts/setup-env.sh \
  --app-domain 10.156.99.35 \
  --admin-email admin@n1njahack.local \
  --admin-name "Administrador Principal" \
  --force

bash scripts/deploy-safe.sh --ensure-admin

# Ver solo dentro del servidor. No subir ni compartir este output.
grep -E '^(ADMIN_DEFAULT_EMAIL|ADMIN_DEFAULT_PASSWORD|POSTGRES_PASSWORD|GRAFANA_ADMIN_PASSWORD)=' .env
```

Si necesitas usar una password temporal elegida por ti, pasala solo en servidor:

```bash
bash scripts/setup-env.sh \
  --app-domain 10.156.99.35 \
  --admin-email admin@n1njahack.local \
  --admin-password 'TU_PASSWORD_TEMPORAL_FUERTE' \
  --db-password 'DB_PASSWORD_URL_SAFE' \
  --grafana-password 'GRAFANA_PASSWORD_TEMPORAL' \
  --force
```

---

## 2) Prechecks obligatorios en servidor

```bash
whoami
hostname
pwd
docker --version
docker compose version
git --version
```

Si `docker compose` falla:

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version
```

Si ves `permission denied` en `/var/run/docker.sock`:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

---

## 3) Configurar acceso GitHub por SSH

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "bitacora-server" -f ~/.ssh/bitacora_github -N ""
cat ~/.ssh/bitacora_github.pub
```

Agrega esa clave en GitHub (Deploy key o cuenta), luego:

```bash
cat <<'EOF' >> ~/.ssh/config
Host github-bitacora
  HostName github.com
  User git
  IdentityFile ~/.ssh/bitacora_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T github-bitacora
```

---

## 4) Clonar proyecto (primera vez)

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github-bitacora:RayCiavato/Bitacora_Grupos.git Bitacora_Grupos
cd ~/apps/Bitacora_Grupos
```

---

## 5) Primera instalacion limpia (solo servidor nuevo)

Este flujo es SOLO para servidor nuevo, sin datos que preservar.
Si el servidor ya tiene bitacoras, tareas, usuarios o adjuntos cargados, NO uses este flujo: usa la seccion `8) Actualizacion segura`.

```bash
cd ~/apps/Bitacora_Grupos
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
  --telegram-enabled true \
  --telegram-bot-token 'REEMPLAZAR_TOKEN_BOT' \
  --telegram-chat-id 'REEMPLAZAR_CHAT_ID' \
  --telegram-alert-cron '*/15 * * * *' \
  --force
```

Que hace este script:
1. Genera `.env` consistente.
2. Hace `deploy-safe` con `--fresh-db` para una instalacion nueva.
3. Reprovisiona admin al final.

Importante:
- `--fresh-db` puede reinicializar datos. No lo uses sobre un servidor productivo con data real.
- Para Telegram de prueba, reemplaza los placeholders solo en el servidor o usa la seccion `7) Activar o actualizar Telegram`.

---

## 6) Verificacion post-despliegue

```bash
cd ~/apps/Bitacora_Grupos
docker compose ps
docker compose logs --tail=150 app
docker compose logs --tail=100 caddy
curl -I http://127.0.0.1
curl -I http://10.156.99.35
```

Esperado:
- `bitacora-app` en `Up` (no `Restarting`).
- `curl` responde `200` o redireccion valida.
- Sin errores `password authentication failed`.

---

## 7) Activar o actualizar Telegram en servidor ya desplegado (sin borrar datos)

Si el stack ya existe y solo quieres activar Telegram:

```bash
cd ~/apps/Bitacora_Grupos

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
    "TELEGRAM_TASK_ALERT_CRON": "*/15 * * * *",
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

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC up -d --no-deps --force-recreate app
$DC logs --tail=120 app | grep -i telegram || true
```

Nota de seguridad:
- El token real del bot no se commitea ni se sube a GitHub.
- Queda guardado solo en `.env` del servidor.
- Para vincular un usuario, inicia sesion en la web y entra a `Configuracion > Telegram`.

---

## 8) Actualizacion segura (sin borrar datos)

Para actualizar version en servidor ya productivo:

```bash
cd ~/apps/Bitacora_Grupos

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

git config core.filemode false
git fetch origin main

# Si hay cambios locales (ej: infra/Caddyfile.internal-https), guardarlos sin perderlos.
if [ -n "$(git status --porcelain)" ]; then
  mkdir -p ~/bitacora-backups
  [ -f infra/Caddyfile.internal-https ] && cp infra/Caddyfile.internal-https ~/bitacora-backups/Caddyfile.internal-https.$(date +%Y%m%d-%H%M%S).bak
  git stash push -u -m "pre-update-$(date +%F-%H%M%S)"
fi

git checkout main
git pull --ff-only origin main

mkdir -p backups
POSTGRES_USER_VALUE="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"

# Backup previo obligatorio antes de migraciones.
$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/pre-groups-update-$(date +%F-%H%M%S).sql.gz"

# Migracion incremental multi-area. No borra tablas ni datos.
cat db/migrations/008_groups_abac.sql | $DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}"

# Rebuild solo app, no tocar DB ni volumenes.
docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app

$DC ps app
$DC logs --tail=120 app
curl -sS http://127.0.0.1/health
```

Validacion de migracion:

```bash
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT slug, is_active FROM groups ORDER BY id;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS tareas_sin_grupo FROM tasks WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS bitacoras_sin_grupo FROM events WHERE group_id IS NULL;"
```

Validacion de UI nueva:

```bash
curl -sS http://10.156.99.35/ | grep -E "asset=web&v=32|asset=tasks&v=32|styles.css\\?v=32"
curl -sS http://10.156.99.35/sw.js | grep "bitacora-v32"
```

Si usas HTTPS interno, cambia `http` por `https` y agrega `-k` a `curl`.

Rollback logico si algo falla:

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

# 1) Volver al commit anterior de app, sin tocar volumenes.
git log --oneline -5
git checkout <COMMIT_ANTERIOR_ESTABLE>
$DC build app
$DC up -d --no-deps --force-recreate app

# 2) Si necesitas restaurar DB, hazlo solo desde backup validado y en ventana de mantenimiento.
# Nunca uses docker compose down -v.
```

---

## 9) Errores comunes y solucion rapida

### A) 502 Bad Gateway en navegador

Generalmente `app` esta reiniciando.

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=120 caddy
```

Si ves error de politica de password admin:

```bash
cd ~/apps/Bitacora_Grupos
read -r -s -p "Nuevo password admin: " ADMIN_PASSWORD; echo
bash scripts/provision-admin.sh admin@n1njahack.local "$ADMIN_PASSWORD" 'Administrador N1njaHack'
docker compose restart app
```

### B) `password authentication failed for user "bitacora_user"`

La DB quedo inicializada con otro password.

No borres volumenes si el servidor tiene data real. Primero genera backup:

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
mkdir -p backups
POSTGRES_USER_VALUE="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/pre-db-auth-fix-$(date +%F-%H%M%S).sql.gz"
$DC logs --tail=200 postgres
```

Luego corrige `.env` para que `POSTGRES_PASSWORD` coincida con la DB existente o restaura desde backup en un servidor nuevo.
No uses `docker compose down -v` ni `docker volume rm` en produccion.

### C) Ejecutaste comandos fuera del repo

Si ves `fatal: not a git repository` o `no configuration file provided`:

```bash
cd ~/apps/Bitacora_Grupos
pwd
ls -la
git status --short
```

### D) `docker compose` no reconocido

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version
```

### E) Pull bloqueado por cambios locales

```bash
cd ~/apps/Bitacora_Grupos
mkdir -p ~/bitacora-backups
[ -f infra/Caddyfile.internal-https ] && cp infra/Caddyfile.internal-https ~/bitacora-backups/Caddyfile.internal-https.$(date +%Y%m%d-%H%M%S).bak
git stash push -u -m "pre-pull-$(date +%F-%H%M%S)"
git pull --ff-only origin main
```

### F) `Conflict. The container name ... is already in use`

Quedo un contenedor viejo con nombre fijo (por ejemplo `bitacora-node-exporter`) y Compose no puede recrearlo.

```bash
cd ~/apps/Bitacora_Grupos
docker rm -f bitacora-node-exporter 2>/dev/null || true
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC up -d --remove-orphans
```

Nota:
- Si haces `git pull` y actualizas a la version nueva de `deploy-safe.sh`, este conflicto se limpia automaticamente y se reintenta el deploy.

---

## 10) Checklist final

```bash
cd ~/apps/Bitacora_Grupos
git rev-parse --short HEAD
docker compose ps
curl -I http://127.0.0.1
```

Validar en UI:
1. Login admin funciona.
2. Dashboard carga.
3. Modulo Tareas carga.
4. Crear/editar/eliminar tarea funciona.
5. Adjuntos se descargan por endpoint protegido.

---

## 11) Comandos de operacion diaria

```bash
cd ~/apps/Bitacora_Grupos
docker compose ps
docker compose logs -f app
docker compose restart app
bash scripts/check-latest-backup.sh
```

Restore de backup:

```bash
cd ~/apps/Bitacora_Grupos
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```
