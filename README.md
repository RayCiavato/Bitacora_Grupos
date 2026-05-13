# Bitacora Grupos

Plataforma interna de bitacoras, tareas, adjuntos, reportes, auditoria, Telegram polling y modelo multi-area con RBAC + ABAC.

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_Grupos.git

Manuales principales:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md): instalacion, actualizacion, backup, Telegram, troubleshooting.
- [HARDENING_PASO_A_PASO_NOVATOS.md](HARDENING_PASO_A_PASO_NOVATOS.md): endurecimiento del servidor paso a paso.
- [docs/HTTPS_INTERNO_CA.md](docs/HTTPS_INTERNO_CA.md): HTTPS interno con CA propia.

---

## Que incluye

- Node.js + Express + PostgreSQL.
- Frontend HTML/CSS/JS servido por la app.
- Caddy como reverse proxy.
- Docker Compose.
- RBAC por roles: `admin`, `supervisor`, `funcionario`.
- ABAC por grupos/areas: `General`, `Soporte`, `Infraestructura`, `Seguridad Tecnologica`, `Gerencia`.
- Dashboard, tareas, bitacoras, adjuntos, reportes, auditoria y notificaciones.
- Telegram en modo polling para no depender de dominio publico ni HTTPS publico.
- SSE/realtime autenticado y filtrado por permisos.
- Exportes Excel/PDF/CSV con control por grupo exportable.
- Acceso institucional cerrado: registro publico desactivado, invitaciones, aprobacion manual, MFA obligatorio y dominios permitidos.
- Soft delete de usuarios para conservar historico.

---

## Modelo multi-area

Regla base:

1. El rol debe permitir la accion sobre el modulo.
2. La matriz de grupo debe permitir la accion sobre el grupo del recurso.
3. Si cualquiera falla, el backend niega la operacion.

Comportamiento inicial recomendado:

- Soporte ve Soporte.
- Infraestructura ve Infraestructura.
- Seguridad Tecnologica puede ver Soporte, Infraestructura y su propio grupo si la matriz lo permite.
- Gerencia tiene visibilidad ejecutiva segun configuracion, sin ser admin tecnico por defecto.
- Admin conserva control tecnico total.
- Datos antiguos se asignan a `General` mediante migracion incremental.

Panel web:

- Roles y permisos > Roles y modulos.
- Roles y permisos > Grupos.
- Roles y permisos > Matriz de visibilidad.
- Roles y permisos > Usuarios por grupo.
- Roles y permisos > Auditoria de permisos.

---

## Instalacion nueva rapida

Usa esto solo en servidor nuevo sin data previa.

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github-bitacora:RayCiavato/Bitacora_Grupos.git Bitacora_Grupos
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
  --force
```

Verificar:

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC ps
curl -sS http://127.0.0.1/health
```

---

## Seguridad institucional

Por defecto el sistema queda en modo cerrado:

- `ALLOW_PUBLIC_REGISTRATION=false`: nadie se registra libremente desde Internet o la LAN.
- `ACCOUNT_APPROVAL_REQUIRED=true`: usuarios nuevos por invitacion quedan pendientes hasta aprobacion.
- `MFA_REQUIRED=true`: usuarios aprobados deben configurar MFA antes de operar.
- `ALLOWED_EMAIL_DOMAINS`: solo dominios institucionales/corporativos autorizados.
- `INTERNAL_NETWORK_ONLY=false`: opcional; si se activa, valida rangos de red/VPN con `ALLOWED_NETWORKS`.

Ejemplo `.env`:

```env
ALLOW_PUBLIC_REGISTRATION=false
ACCOUNT_APPROVAL_REQUIRED=true
MFA_REQUIRED=true
ALLOWED_EMAIL_DOMAINS=bitacora.local,empresa.local,empresa.com,institucion.gob.ve
ALLOW_EMAIL_SUBDOMAINS=true
INTERNAL_NETWORK_ONLY=false
ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32
INVITE_TTL_HOURS=48
```

Flujo recomendado:

1. Admin entra al panel Usuarios.
2. Crea una invitacion con correo, rol y grupo.
3. El usuario acepta el token de invitacion.
4. Admin aprueba la cuenta.
5. El usuario inicia sesion y configura MFA.

Los usuarios existentes no se eliminan ni se modifican retroactivamente. Si un usuario viejo necesita cambiar correo, un admin puede actualizarlo a un dominio corporativo permitido desde Usuarios.

---

## Actualizacion de una Bitacora vieja

Si ya tienes data cargada, no reinstales desde cero y no borres volumenes.

Reglas criticas:

- No usar `docker compose down -v`.
- No borrar `postgres_data` ni volumenes.
- No usar `--fresh-db`.
- Mantener la carpeta productiva actual si ya tiene los volumenes de Docker Compose.
- Hacer backup antes de migrar.

Flujo recomendado:

```bash
cd ~/apps/Bitacora_gestor_tareas  # o la carpeta productiva actual

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

git remote set-url origin git@github-bitacora:RayCiavato/Bitacora_Grupos.git
git fetch origin main

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

$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/pre-update-$(date +%F-%H%M%S).sql.gz"

for migration in \
  db/migrations/008_groups_abac.sql \
  db/migrations/009_gerencial_role.sql \
  db/migrations/010_remove_gerencial_role_usage.sql \
  db/migrations/011_institutional_access.sql
do
  [ -f "$migration" ] && cat "$migration" | $DC exec -T postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}"
done

docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app

$DC ps app
curl -sS http://127.0.0.1/health
```

Validar grupos:

```bash
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT slug, is_active FROM groups ORDER BY id;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS tasks_sin_grupo FROM tasks WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS events_sin_grupo FROM events WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT account_status, COUNT(*) FROM users GROUP BY account_status ORDER BY account_status;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS invitaciones FROM user_invites;"
```

---

## Telegram

Para servidores internos sin dominio publico usa polling.

Variables minimas en `.env`:

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=REEMPLAZAR_TOKEN
TELEGRAM_CHAT_ID=REEMPLAZAR_CHAT_ID
TELEGRAM_BOT_INTERACTIVE_ENABLED=true
TELEGRAM_BOT_MODE=polling
TELEGRAM_POLLING_TIMEOUT=30
TELEGRAM_POLLING_INTERVAL_MS=1000
TELEGRAM_POLLING_ALLOWED_UPDATES=message,callback_query
```

Si usas grupos separados por area:

```env
TELEGRAM_GROUP_CHAT_IDS=soporte=-100111,infraestructura=-100222,seguridad-tecnologica=-100333,gerencia=-100444
```

Antes de activar polling:

```bash
set -a
. ./.env
set +a
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

Para vincular usuario:

1. Iniciar sesion en la web.
2. Ir a Configuracion > Telegram.
3. Generar codigo.
4. En Telegram enviar `/start CODIGO`.
5. Usar `/menu`.

---

## Comandos de validacion local del repo

```bash
npm --prefix app run lint
npm test --prefix app
npm --prefix app run build:assets
npm --prefix app audit --omit=dev --audit-level=moderate
```

---

## Troubleshooting rapido

### `docker: unknown command: docker compose`

Usa fallback:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC version
```

Si no tienes ninguno, instala Docker Compose plugin desde el manual principal.

### `KeyError: 'ContainerConfig'`

Suele pasar con `docker-compose` v1 y contenedores viejos.

```bash
docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app
```

### `502 Bad Gateway`

```bash
$DC ps
$DC logs --tail=200 app
$DC logs --tail=120 caddy
```

Normalmente la app no arranco, Caddy no ve `app:3000`, o se clono en otra carpeta y Compose creo otra red/volumen.

### `Permission denied (publickey)` con GitHub

Revisa `MANUAL_DESPLIEGUE_SERVIDOR.md`, seccion GitHub SSH.

### Backup `Permission denied`

```bash
mkdir -p backups
sudo chown -R "$USER:$USER" backups
```

---

## Seguridad basica

- Nunca subir `.env` a GitHub.
- Nunca subir tokens Telegram reales.
- Nunca compartir `server.key`, `ca.key` ni backups de DB.
- No usar `down -v` en servidores con data.
- Hacer backup antes de migraciones.
