# HTTPS interno con CA propia

Esta guia habilita HTTPS interno para Bitacora sin dominio publico, sin Let's Encrypt y sin exponer la app a Internet.

Arquitectura:

```text
Usuarios internos -> HTTPS interno -> Caddy -> app:3000
```

El Caddyfile interno escucha `:443` con certificado propio para responder tambien a clientes que
entren por IP y no envien SNI, por ejemplo algunos `curl` o navegadores en redes internas.

El perfil recomendado es:

```env
CADDY_PROFILE=internal-https
INTERNAL_HTTPS_ENABLED=true
INTERNAL_HTTPS_IP=10.156.99.35
INTERNAL_HOSTNAME=bitacora.local
INTERNAL_ALT_HOSTNAME=bitacora.interno
INTERNAL_EXTRA_HOSTNAME=opsbitacora.local
PUBLIC_BASE_URL=https://bitacora.local
APP_INTERNAL_URL=https://bitacora.local
COOKIE_SECURE=true
TELEGRAM_BOT_MODE=polling
```

## 1. Backup previo

No uses `docker compose down -v`. Antes de tocar Caddy o certificados, genera backup:

```bash
cd ~/apps/Bitacora_gestor_tareas

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
set -a
. ./.env
set +a

mkdir -p backups/manual
$DC exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -Fc \
  > "backups/manual/bitacora-pre-internal-https-$(date +%F-%H%M%S).dump"
```

## 2. Generar CA y certificado servidor

```bash
cd ~/apps/Bitacora_gestor_tareas

bash scripts/generate-internal-certs.sh \
  --ip 10.156.99.35 \
  --dns "bitacora.local,bitacora.interno,opsbitacora.local"

chmod 600 certs/internal/*.key
chmod 644 certs/internal/*.crt
```

Archivos generados:

- `certs/internal/ca.crt`: CA publica para instalar en clientes.
- `certs/internal/ca.key`: clave privada de la CA. No compartir.
- `certs/internal/server.crt`: certificado servidor montado en Caddy.
- `certs/internal/server.key`: clave privada servidor. No compartir.

## 3. Activar HTTPS interno en `.env`

```bash
cd ~/apps/Bitacora_gestor_tareas
cp .env ".env.pre-internal-https-$(date +%F-%H%M%S)"

python3 - <<'PY'
from pathlib import Path

env_path = Path(".env")
values = {
    "APP_DOMAIN": "10.156.99.35",
    "CADDY_PROFILE": "internal-https",
    "INTERNAL_HTTPS_ENABLED": "true",
    "INTERNAL_HTTPS_IP": "10.156.99.35",
    "INTERNAL_HOSTNAME": "bitacora.local",
    "INTERNAL_ALT_HOSTNAME": "bitacora.interno",
    "INTERNAL_EXTRA_HOSTNAME": "opsbitacora.local",
    "CADDY_HTTP_BIND": "10.156.99.35",
    "CADDY_HTTPS_BIND": "10.156.99.35",
    "PUBLIC_BASE_URL": "https://bitacora.local",
    "APP_INTERNAL_URL": "https://bitacora.local",
    "COOKIE_SECURE": "true",
    "TELEGRAM_BOT_MODE": "polling",
}

lines = env_path.read_text().splitlines()
seen = set()
out = []
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
```

Si el servidor solo tiene interfaz interna, `CADDY_HTTP_BIND` y `CADDY_HTTPS_BIND` pueden quedar en `0.0.0.0`. Si tiene otra interfaz expuesta, dejalos apuntando a `10.156.99.35`.

## 4. Mantener Telegram en polling

No configures webhook. Si existia uno, limpialo:

```bash
set -a
. ./.env
set +a

curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

Variables esperadas:

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_INTERACTIVE_ENABLED=true
TELEGRAM_BOT_MODE=polling
```

## 5. Desplegar sin perder data

```bash
cd ~/apps/Bitacora_gestor_tareas

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

$DC build app
$DC up -d --no-deps --force-recreate app caddy

$DC ps app caddy
$DC logs --tail=120 caddy
$DC logs --tail=120 app | grep -i telegram || true
```

No ejecutes:

```bash
docker compose down -v
```

## 6. DNS o hosts interno

Opcion A, acceso por IP:

```text
https://10.156.99.35
```

Opcion B, nombre interno:

```text
https://bitacora.local
https://bitacora.interno
```

Si no hay DNS interno, en Windows edita como administrador:

```text
C:\Windows\System32\drivers\etc\hosts
```

Agrega:

```text
10.156.99.35 bitacora.local
10.156.99.35 bitacora.interno
10.156.99.35 opsbitacora.local
```

## 7. Instalar CA en clientes Windows

Instala solo `certs/internal/ca.crt`.

Metodo MMC:

1. Ejecutar `mmc`.
2. `File` -> `Add/Remove Snap-in`.
3. Seleccionar `Certificates`.
4. Elegir `Computer account`.
5. Elegir `Local computer`.
6. Abrir `Trusted Root Certification Authorities`.
7. Abrir `Certificates`.
8. `Import`.
9. Seleccionar `ca.crt`.

Alternativa:

1. Ejecutar `certmgr.msc`.
2. Ir a `Trusted Root Certification Authorities`.
3. `Certificates` -> `Import`.
4. Importar `ca.crt`.

Nunca instales ni compartas:

- `ca.key`
- `server.key`

## 8. Validacion

Desde servidor:

```bash
curl -k -I https://10.156.99.35
curl -k -sS https://10.156.99.35/health
openssl s_client -connect 10.156.99.35:443 -showcerts </dev/null
```

Ver SAN:

```bash
openssl x509 -in certs/internal/server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

Docker:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC logs --tail=120 caddy
$DC logs --tail=120 app
```

Pruebas funcionales:

- Login.
- Dashboard.
- `/realtime/stream` desde navegador autenticado.
- Preview de adjuntos.
- Telegram `/menu`, callbacks y `/buscar`.
- Notificaciones Telegram salientes.

## 9. Firewall

Permite 443 solo desde la red interna. Ejemplo con UFW:

```bash
sudo ufw allow from 10.156.99.0/24 to any port 443 proto tcp
sudo ufw allow from 10.156.99.0/24 to any port 80 proto tcp
sudo ufw deny 443/tcp
sudo ufw deny 80/tcp
sudo ufw status numbered
```

Ajusta el segmento `10.156.99.0/24` segun tu red real.

## 10. Rollback seguro

Rollback a HTTP interno sin tocar DB:

```bash
cd ~/apps/Bitacora_gestor_tareas
cp .env ".env.rollback-internal-https-$(date +%F-%H%M%S)"

python3 - <<'PY'
from pathlib import Path

env_path = Path(".env")
values = {
    "CADDY_PROFILE": "http",
    "INTERNAL_HTTPS_ENABLED": "false",
    "COOKIE_SECURE": "false",
}
lines = env_path.read_text().splitlines()
seen = set()
out = []
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

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC up -d --no-deps --force-recreate app caddy
$DC logs --tail=120 caddy
```

No borres certificados ni backups durante el rollback. Si luego decides rotar CA, usa:

```bash
bash scripts/generate-internal-certs.sh --rotate-ca
```

Eso obliga a reinstalar el nuevo `ca.crt` en todos los clientes.
