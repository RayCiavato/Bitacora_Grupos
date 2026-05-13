# Manual De Despliegue En Servidor Ubuntu

Proyecto: Bitacora Grupos
Repositorio: https://github.com/RayCiavato/Bitacora_Grupos.git

Este manual esta escrito para que una persona nueva pueda instalar, actualizar y diagnosticar el sistema sin perder datos.

---

## 0) Reglas De Oro

Antes de ejecutar comandos en produccion:

- No usar `docker compose down -v`.
- No borrar volumenes Docker.
- No borrar la base de datos.
- No ejecutar `--fresh-db` en un servidor con data real.
- No subir `.env`, tokens, backups ni claves privadas a GitHub.
- Hacer backup PostgreSQL antes de migraciones.
- Mantener Telegram interactivo en `polling` si no hay dominio publico HTTPS.
- Si actualizas una Bitacora vieja, usa la carpeta productiva actual para no cambiar el nombre del proyecto Compose.

---

## 1) Arquitectura

```text
Usuarios internos -> Caddy :80/:443 -> app:3000 -> PostgreSQL
                                      -> Telegram polling saliente
                                      -> SSE/realtime autenticado
```

Componentes:

- `app`: Node.js + Express + frontend.
- `postgres`: base de datos.
- `caddy`: reverse proxy.
- `backup`: jobs/servicios de respaldo si estan habilitados.
- observabilidad: Prometheus, Grafana, Loki, etc. segun compose.

Modelo de seguridad:

- RBAC por rol: `admin`, `supervisor`, `funcionario`.
- ABAC por grupo/area: `General`, `Soporte`, `Infraestructura`, `Seguridad Tecnologica`, `Gerencia`.
- Exportes validan permiso `can_export` por grupo.
- SSE falla cerrado si un evento no tiene visibilidad definida.
- Telegram saliente envia detalles solo a chats autorizados por grupo; chat global recibe resumen minimo si no hay segregacion.

---

## 2) Prerrequisitos Del Servidor

Servidor recomendado:

- Ubuntu 22.04 LTS o superior.
- Docker instalado.
- Docker Compose v2 recomendado.
- Git.
- Salida a Internet para instalar paquetes y usar Telegram polling.
- Puertos internos: `80` y/o `443`.

Precheck:

```bash
whoami
hostname
ip a | grep -E 'inet '
docker --version
docker compose version || docker-compose version
git --version
```

Elegir comando Compose en cada sesion:

```bash
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi
$DC version
```

### Si `docker compose` no existe

Primero intenta instalar plugin:

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
```

Si Ubuntu dice `No se ha podido localizar el paquete docker-compose-plugin`, probablemente Docker no fue instalado desde el repositorio oficial. Puedes seguir usando `docker-compose` v1 si ya existe:

```bash
docker-compose version
```

Si no existe ningun Compose, instala el plugin desde el repositorio oficial de Docker o usa el paquete standalone que tu area Linux tenga aprobado. Despues vuelve a correr:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC version
```

---

## 3) Configurar SSH Para GitHub

Generar clave en el servidor:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "bitacora-server" -f ~/.ssh/bitacora_github -N ""
cat ~/.ssh/bitacora_github.pub
```

En GitHub:

1. Abre el repo `RayCiavato/Bitacora_Grupos`.
2. Ve a Settings > Deploy keys.
3. Add deploy key.
4. Pega la clave publica.
5. Marca `Allow write access` solo si ese servidor tambien va a hacer push. Para desplegar, solo lectura basta.

Configurar alias SSH:

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

Esperado:

```text
Hi ...! You've successfully authenticated, but GitHub does not provide shell access.
```

Si sale `Permission denied (publickey)`, revisa:

```bash
ls -l ~/.ssh/bitacora_github ~/.ssh/bitacora_github.pub ~/.ssh/config
ssh -vT github-bitacora
```

---

## 4) Instalacion Nueva Desde Cero

Usa esta seccion solo si el servidor NO tiene data previa.

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github-bitacora:RayCiavato/Bitacora_Grupos.git Bitacora_Grupos
cd ~/apps/Bitacora_Grupos
chmod +x scripts/*.sh
```

Crear `.env` e instalar:

```bash
read -r -s -p "Admin password inicial: " ADMIN_PASSWORD; echo
read -r -s -p "DB password URL-safe: " DB_PASSWORD; echo
read -r -s -p "Grafana password: " GRAFANA_PASSWORD; echo

bash scripts/install-server-safe.sh \
  --app-domain 10.156.99.35 \
  --admin-email admin@n1njahack.local \
  --admin-password "$ADMIN_PASSWORD" \
  --db-password "$DB_PASSWORD" \
  --grafana-password "$GRAFANA_PASSWORD" \
  --force
```

Notas:

- Usa una DB password simple para URL: letras, numeros, `_` o `-`.
- El admin inicial `admin@n1njahack.local` es creado por provisioning. El registro publico queda deshabilitado por defecto y los usuarios nuevos deben entrar por invitacion.
- Cambia la password admin despues del primer login.

Verificar:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC ps
$DC logs --tail=120 app
curl -sS http://127.0.0.1/health
curl -I http://10.156.99.35/
```

---

## 5) Actualizacion De Una Bitacora Vieja

Usa esta seccion si ya existe un sistema con datos cargados.

### 5.1 Decidir carpeta correcta

Si tu instalacion vieja esta en:

```bash
~/apps/Bitacora_gestor_tareas
```

continua usando esa carpeta para preservar el proyecto Docker Compose y sus volumenes.

No clones en otra carpeta productiva sin definir `COMPOSE_PROJECT_NAME`, porque Compose podria crear volumenes nuevos vacios y pareceria que se perdio data.

### 5.2 Preparar update

```bash
cd ~/apps/Bitacora_gestor_tareas  # o tu carpeta productiva actual

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

git remote -v
git remote set-url origin git@github-bitacora:RayCiavato/Bitacora_Grupos.git
git fetch origin main
```

Si hay cambios locales:

```bash
if [ -n "$(git status --porcelain)" ]; then
  mkdir -p ~/bitacora-backups
  [ -f infra/Caddyfile.internal-https ] && cp infra/Caddyfile.internal-https ~/bitacora-backups/Caddyfile.internal-https.$(date +%Y%m%d-%H%M%S).bak
  cp .env ~/bitacora-backups/env.$(date +%Y%m%d-%H%M%S).bak 2>/dev/null || true
  git stash push -u -m "pre-update-$(date +%F-%H%M%S)"
fi
```

Actualizar codigo:

```bash
git checkout main
git pull --ff-only origin main
```

### 5.3 Backup obligatorio

```bash
mkdir -p backups
sudo chown -R "$USER:$USER" backups

POSTGRES_USER_VALUE="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"

$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/pre-update-$(date +%F-%H%M%S).sql.gz"
ls -lh backups | tail
```

Si aparece `Permission denied`, estas redirigiendo a un sitio donde tu usuario no puede escribir. Ejecuta:

```bash
mkdir -p backups
sudo chown -R "$USER:$USER" backups
```

### 5.4 Migraciones incrementales multi-area e institucionales

```bash
for migration in \
  db/migrations/008_groups_abac.sql \
  db/migrations/009_gerencial_role.sql \
  db/migrations/010_remove_gerencial_role_usage.sql \
  db/migrations/011_institutional_access.sql
do
  if [ -f "$migration" ]; then
    echo "Aplicando $migration"
    cat "$migration" | $DC exec -T postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}"
  fi
done
```

Validar migracion:

```bash
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT slug, is_active FROM groups ORDER BY id;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS tasks_sin_grupo FROM tasks WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS events_sin_grupo FROM events WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS attachments_sin_grupo FROM event_attachments WHERE group_id IS NULL;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT account_status, COUNT(*) FROM users GROUP BY account_status ORDER BY account_status;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) AS invitaciones FROM user_invites;"
```

Esperado: los conteos `sin_grupo` deben ser `0`.

### 5.4.1 Variables institucionales recomendadas

Despues de actualizar, revisa `.env`:

```bash
cp .env ".env.backup.institucional.$(date +%F-%H%M%S)"

grep -q '^ALLOW_PUBLIC_REGISTRATION=' .env && sed -i 's/^ALLOW_PUBLIC_REGISTRATION=.*/ALLOW_PUBLIC_REGISTRATION=false/' .env || echo 'ALLOW_PUBLIC_REGISTRATION=false' >> .env
grep -q '^ACCOUNT_APPROVAL_REQUIRED=' .env && sed -i 's/^ACCOUNT_APPROVAL_REQUIRED=.*/ACCOUNT_APPROVAL_REQUIRED=true/' .env || echo 'ACCOUNT_APPROVAL_REQUIRED=true' >> .env
grep -q '^MFA_REQUIRED=' .env && sed -i 's/^MFA_REQUIRED=.*/MFA_REQUIRED=true/' .env || echo 'MFA_REQUIRED=true' >> .env
grep -q '^INVITE_TTL_HOURS=' .env && sed -i 's/^INVITE_TTL_HOURS=.*/INVITE_TTL_HOURS=48/' .env || echo 'INVITE_TTL_HOURS=48' >> .env
grep -q '^ALLOWED_EMAIL_DOMAINS=' .env && sed -i 's/^ALLOWED_EMAIL_DOMAINS=.*/ALLOWED_EMAIL_DOMAINS=bitacora.local,empresa.local,empresa.com,institucion.gob.ve/' .env || echo 'ALLOWED_EMAIL_DOMAINS=bitacora.local,empresa.local,empresa.com,institucion.gob.ve' >> .env
grep -q '^ALLOW_EMAIL_SUBDOMAINS=' .env && sed -i 's/^ALLOW_EMAIL_SUBDOMAINS=.*/ALLOW_EMAIL_SUBDOMAINS=true/' .env || echo 'ALLOW_EMAIL_SUBDOMAINS=true' >> .env
grep -q '^INTERNAL_NETWORK_ONLY=' .env && sed -i 's/^INTERNAL_NETWORK_ONLY=.*/INTERNAL_NETWORK_ONLY=false/' .env || echo 'INTERNAL_NETWORK_ONLY=false' >> .env
grep -q '^ALLOWED_NETWORKS=' .env && sed -i 's#^ALLOWED_NETWORKS=.*#ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32#' .env || echo 'ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32' >> .env
```

Si necesitas dominios reales de la institucion, reemplaza `ALLOWED_EMAIL_DOMAINS` por los dominios aprobados antes de recrear la app.

El flujo nuevo es:

1. Admin crea invitacion desde Usuarios.
2. Usuario acepta token.
3. Admin aprueba cuenta pendiente.
4. Usuario inicia sesion y configura MFA.
5. Usuarios pendientes/suspendidos no acceden a dashboard, SSE ni Telegram.

### 5.5 Rebuild solo app

```bash
docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app

$DC ps app
$DC logs --tail=120 app
curl -sS http://127.0.0.1/health
```

Si Caddy tambien debe tomar nuevo Caddyfile o certificados:

```bash
$DC up -d --no-deps --force-recreate app caddy
$DC ps app caddy
```

---

## 6) Telegram Polling Sin Dominio Publico

Telegram webhook requiere URL publica HTTPS valida. Para una app interna por IP, usa polling.

### 6.1 Cargar token y chat ID

```bash
cd ~/apps/Bitacora_Grupos  # o carpeta productiva actual

unset TELEGRAM_BOT_TOKEN_VALUE TELEGRAM_CHAT_ID_VALUE
read -r -s -p "Pega token Telegram: " TELEGRAM_BOT_TOKEN_VALUE; echo
read -r -p "Pega chat id Telegram: " TELEGRAM_CHAT_ID_VALUE

export TELEGRAM_BOT_TOKEN_VALUE="$(printf '%s' "$TELEGRAM_BOT_TOKEN_VALUE" | tr -cd 'A-Za-z0-9_:-')"
export TELEGRAM_CHAT_ID_VALUE="$(printf '%s' "$TELEGRAM_CHAT_ID_VALUE" | tr -cd '0-9-')"

python3 - <<'PY'
import os
from pathlib import Path

env_path = Path('.env')
values = {
    'TELEGRAM_ENABLED': 'true',
    'TELEGRAM_BOT_TOKEN': os.environ['TELEGRAM_BOT_TOKEN_VALUE'],
    'TELEGRAM_CHAT_ID': os.environ['TELEGRAM_CHAT_ID_VALUE'],
    'TELEGRAM_BOT_INTERACTIVE_ENABLED': 'true',
    'TELEGRAM_BOT_MODE': 'polling',
    'TELEGRAM_POLLING_TIMEOUT': '30',
    'TELEGRAM_POLLING_INTERVAL_MS': '1000',
    'TELEGRAM_POLLING_ALLOWED_UPDATES': 'message,callback_query',
}
lines = env_path.read_text().splitlines() if env_path.exists() else []
out, seen = [], set()
for line in lines:
    key = line.split('=', 1)[0] if '=' in line else None
    if key in values:
        out.append(f'{key}={values[key]}')
        seen.add(key)
    else:
        out.append(line)
for key, value in values.items():
    if key not in seen:
        out.append(f'{key}={value}')
env_path.write_text('\n'.join(out) + '\n')
PY
```

### 6.2 Borrar webhook previo

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_VALUE}/deleteWebhook?drop_pending_updates=false"
```

Si ves `InvalidURL` con caracteres raros, pegaste el token con teclas de cursor o basura invisible. Repite el `read`, no pegues el texto `Id:` en el chat id, solo el numero.

### 6.3 Chats por area

Opcional para segregacion real por grupo:

```env
TELEGRAM_GROUP_CHAT_IDS=soporte=-100111,infraestructura=-100222,seguridad-tecnologica=-100333,gerencia=-100444
```

Si no configuras chats por area, el chat global recibe solo resumen minimo para evitar fuga entre areas.

### 6.4 Recrear app

```bash
$DC up -d --no-deps --force-recreate app
$DC logs --tail=160 app | grep -i telegram || true
```

### 6.5 Vincular usuario

1. Entrar a la web.
2. Ir a Configuracion > Telegram.
3. Generar codigo.
4. En Telegram enviar `/start CODIGO`.
5. Usar `/menu`.

---

## 7) HTTPS Interno Con CA Propia

Guia completa: `docs/HTTPS_INTERNO_CA.md`.

Resumen:

```bash
cd ~/apps/Bitacora_Grupos
bash scripts/generate-internal-certs.sh \
  --ip 10.156.99.35 \
  --dns "bitacora.local,bitacora.interno,opsbitacora.local"

chmod 600 certs/internal/*.key
chmod 644 certs/internal/*.crt
```

Activar variables:

```env
CADDY_PROFILE=internal-https
INTERNAL_HTTPS_ENABLED=true
INTERNAL_HTTPS_IP=10.156.99.35
INTERNAL_HOSTNAME=bitacora.local
CADDY_HTTP_BIND=10.156.99.35
CADDY_HTTPS_BIND=10.156.99.35
COOKIE_SECURE=true
TELEGRAM_BOT_MODE=polling
```

Recrear:

```bash
$DC up -d --no-deps --force-recreate app caddy
curl -k -I https://10.156.99.35
```

Importante:

- Para que el navegador marque como valido, instala `certs/internal/ca.crt` en cada cliente Windows como entidad raiz confiable.
- No existe forma segura de que un certificado propio sea confiable automaticamente en todos los equipos sin instalar la CA o usar una CA ya confiada por esos equipos.
- Nunca compartas `ca.key` ni `server.key`.

---

## 8) Verificacion Final De Produccion

```bash
cd ~/apps/Bitacora_Grupos  # o carpeta productiva actual
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

git rev-parse --short HEAD
$DC ps
$DC logs --tail=120 app
$DC logs --tail=80 caddy
curl -sS http://127.0.0.1/health
```

Validar en navegador:

1. Login admin.
2. Dashboard carga.
3. Tareas lista tareas previas.
4. `+ Nueva tarea` abre panel pantalla completa.
5. Bitacoras crean y listan.
6. Roles y permisos muestra pestañas de grupos.
7. Adjuntos descargan y preview funciona.
8. Telegram `/menu` responde.

Validar assets actuales sin amarrarse a version futura:

```bash
curl -sS http://10.156.99.35/ | grep -E "assets/app.min.js\?asset=web|assets/tasks.min.js\?asset=tasks"
curl -sS http://10.156.99.35/sw.js | grep "bitacora-v"
```

---

## 9) Troubleshooting De Errores Reales

### 9.1 `docker: unknown command: docker compose`

Usa variable fallback:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC version
```

Si no existe `docker-compose`, instala Compose plugin o usa paquete aprobado por tu distro.

### 9.2 `KeyError: 'ContainerConfig'`

Pasa con `docker-compose` v1 y contenedores/imagenes nuevas.

```bash
docker ps -aq --filter "name=bitacora-app" | xargs -r docker rm -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app
```

Si persiste, intenta usar Docker Compose v2.

### 9.3 `502 Bad Gateway`

Primero mira si app esta arriba:

```bash
$DC ps
$DC logs --tail=200 app
$DC logs --tail=160 caddy
```

Causas comunes:

- `app` se cae por error de `.env`.
- Caddy no resuelve `app` porque app y caddy quedaron en proyectos Compose distintos.
- Se clono en carpeta nueva y Docker creo red/volumen nuevo.
- App aun esta iniciando.

Arreglo seguro:

```bash
$DC up -d --no-deps --force-recreate app caddy
$DC ps app caddy
curl -sS http://127.0.0.1/health
```

### 9.4 Caddy: `lookup app on 127.0.0.11:53: server misbehaving`

Recrea app y Caddy juntos dentro del mismo Compose project:

```bash
$DC up -d --no-deps --force-recreate app caddy
```

Si moviste el repo de carpeta, vuelve a la carpeta productiva vieja o define el mismo `COMPOSE_PROJECT_NAME` que usaba antes.

### 9.5 Backup `Permission denied`

```bash
mkdir -p backups
sudo chown -R "$USER:$USER" backups
$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/test-backup.sql.gz"
```

### 9.6 GitHub `Permission denied (publickey)`

```bash
ssh -vT github-bitacora
cat ~/.ssh/bitacora_github.pub
```

Asegura que esa clave este en Deploy keys del repo nuevo.

### 9.7 Pull bloqueado por cambios locales

```bash
git status --short
git stash push -u -m "pre-pull-$(date +%F-%H%M%S)"
git pull --ff-only origin main
```

Si quieres recuperar un archivo del stash:

```bash
git stash list
git stash show --name-only stash@{0}
git checkout stash@{0} -- ruta/del/archivo
```

### 9.8 Docker build: `parent snapshot ... does not exist`

Es corrupcion/cache del builder, no de la app.

```bash
docker builder prune -f
$DC build --no-cache app
$DC up -d --no-deps --force-recreate app
```

Si el disco esta lleno:

```bash
df -h
docker system df
```

No borres volumenes de DB. Si necesitas limpiar imagenes viejas:

```bash
docker image prune -f
```

### 9.9 `curl http://127.0.0.1/health` da connection refused

Si Caddy escucha solo en `10.156.99.35`, prueba:

```bash
curl -sS http://10.156.99.35/health
$DC ps caddy
```

### 9.10 Navegador dice certificado no seguro

Con CA propia es normal hasta instalar `ca.crt` en el cliente.

- Instala solo `certs/internal/ca.crt`.
- Nunca instales ni compartas `ca.key`.
- Verifica SAN:

```bash
openssl x509 -in certs/internal/server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

### 9.11 No aparece data vieja despues de update

Revisa que no estes en otra carpeta/proyecto Compose:

```bash
pwd
$DC ps
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) FROM tasks;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT COUNT(*) FROM events;"
```

Si la DB tiene data pero la UI no muestra:

```bash
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT id, slug FROM groups ORDER BY id;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT role, COUNT(*) FROM users GROUP BY role;"
$DC logs --tail=160 app
```

Luego entra como admin y revisa Roles y permisos > Grupos / Usuarios por grupo / Matriz de visibilidad.

---

## 10) Rollback Seguro

Rollback de app sin tocar DB:

```bash
git log --oneline -10
git checkout <COMMIT_ANTERIOR_ESTABLE>
$DC build app
$DC up -d --no-deps --force-recreate app
```

Restaurar DB solo en ventana de mantenimiento:

```bash
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```

No borrar certificados ni backups durante rollback.

---

## 11) Operacion Diaria

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

$DC ps
$DC logs -f app
bash scripts/check-latest-backup.sh
```

Backup manual:

```bash
mkdir -p backups/manual
$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/manual/backup-$(date +%F-%H%M%S).sql.gz"
```
