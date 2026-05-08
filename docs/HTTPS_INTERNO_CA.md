# HTTPS Interno Con CA Propia

Esta guia habilita HTTPS interno para Bitacora sin dominio publico, sin Let's Encrypt y sin Cloudflare Tunnel.

Arquitectura:

```text
Usuarios internos -> HTTPS interno -> Caddy -> app:3000
```

Casos soportados:

- `https://10.156.99.35`
- `https://bitacora.local`
- `https://bitacora.interno`
- `https://opsbitacora.local`

Importante:

- Con una CA propia, el navegador solo confiara en el certificado despues de instalar `ca.crt` en cada equipo cliente o mediante politica de dominio/AD.
- No existe una forma segura de que un certificado propio sea valido automaticamente en todos los navegadores sin instalar la CA.
- Telegram interactivo debe seguir en `polling`; no uses webhook publico si la app es interna.

---

## 0) Reglas Criticas

No ejecutar en servidores con data:

```bash
docker compose down -v
docker volume rm
docker system prune --volumes
```

No compartir:

- `certs/internal/ca.key`
- `certs/internal/server.key`
- `.env`
- backups de DB

---

## 1) Backup Previo

```bash
cd ~/apps/Bitacora_Grupos  # o tu carpeta productiva real

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
mkdir -p backups/manual
sudo chown -R "$USER:$USER" backups

POSTGRES_USER_VALUE="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"

$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/manual/pre-internal-https-$(date +%F-%H%M%S).sql.gz"
```

---

## 2) Generar CA Y Certificado Del Servidor

```bash
cd ~/apps/Bitacora_Grupos

bash scripts/generate-internal-certs.sh \
  --ip 10.156.99.35 \
  --dns "bitacora.local,bitacora.interno,opsbitacora.local"

chmod 600 certs/internal/*.key
chmod 644 certs/internal/*.crt
```

Archivos:

- `certs/internal/ca.crt`: se instala en clientes.
- `certs/internal/ca.key`: privada, no compartir.
- `certs/internal/server.crt`: Caddy la usa.
- `certs/internal/server.key`: privada, no compartir.

Validar SAN:

```bash
openssl x509 -in certs/internal/server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

Debe incluir:

```text
IP Address:10.156.99.35, DNS:bitacora.local, DNS:bitacora.interno, DNS:opsbitacora.local
```

---

## 3) Activar HTTPS Interno En `.env`

```bash
cd ~/apps/Bitacora_Grupos
cp .env ".env.pre-internal-https-$(date +%F-%H%M%S)"

python3 - <<'PY'
from pathlib import Path

env_path = Path('.env')
values = {
    'APP_DOMAIN': '10.156.99.35',
    'CADDY_PROFILE': 'internal-https',
    'INTERNAL_HTTPS_ENABLED': 'true',
    'INTERNAL_HTTPS_IP': '10.156.99.35',
    'INTERNAL_HOSTNAME': 'bitacora.local',
    'INTERNAL_ALT_HOSTNAME': 'bitacora.interno',
    'INTERNAL_EXTRA_HOSTNAME': 'opsbitacora.local',
    'CADDY_HTTP_BIND': '10.156.99.35',
    'CADDY_HTTPS_BIND': '10.156.99.35',
    'PUBLIC_BASE_URL': 'https://bitacora.local',
    'APP_INTERNAL_URL': 'https://bitacora.local',
    'COOKIE_SECURE': 'true',
    'TELEGRAM_BOT_MODE': 'polling',
}
lines = env_path.read_text().splitlines() if env_path.exists() else []
seen, out = set(), []
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

Si el servidor solo existe en red interna, puedes usar `0.0.0.0` para binds. Si tiene otra interfaz expuesta, mantener `10.156.99.35` reduce superficie.

---

## 4) Mantener Telegram En Polling

No configures webhook.

```bash
set -a
. ./.env
set +a

if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
fi
```

Variables esperadas:

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_INTERACTIVE_ENABLED=true
TELEGRAM_BOT_MODE=polling
```

---

## 5) Recrear App Y Caddy Sin Perder Data

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

$DC build app
$DC up -d --no-deps --force-recreate app caddy

$DC ps app caddy
$DC logs --tail=120 caddy
$DC logs --tail=120 app
```

Validar:

```bash
curl -k -I https://10.156.99.35
curl -k -sS https://10.156.99.35/health
```

Si responde con certificado pero navegador dice no seguro, falta instalar `ca.crt` en el cliente.

---

## 6) DNS Interno O Archivo Hosts

Opcion A: usar IP.

```text
https://10.156.99.35
```

Opcion B: usar nombre interno.

En Windows, editar como administrador:

```text
C:\Windows\System32\drivers\etc\hosts
```

Agregar:

```text
10.156.99.35 bitacora.local
10.156.99.35 bitacora.interno
10.156.99.35 opsbitacora.local
```

---

## 7) Instalar CA En Clientes Windows

Instala solo:

```text
certs/internal/ca.crt
```

Metodo `certmgr.msc`:

1. Abrir `certmgr.msc` como administrador.
2. Ir a `Trusted Root Certification Authorities`.
3. Abrir `Certificates`.
4. Click derecho > All Tasks > Import.
5. Seleccionar `ca.crt`.
6. Finalizar e iniciar de nuevo el navegador.

Metodo MMC:

1. Ejecutar `mmc`.
2. File > Add/Remove Snap-in.
3. Certificates.
4. Computer account.
5. Local computer.
6. Trusted Root Certification Authorities > Certificates.
7. Importar `ca.crt`.

Nunca instalar ni compartir:

- `ca.key`
- `server.key`

---

## 8) Firewall Interno

Ejemplo UFW:

```bash
sudo ufw allow from 10.156.99.0/24 to any port 443 proto tcp
sudo ufw allow from 10.156.99.0/24 to any port 80 proto tcp
sudo ufw status numbered
```

Ajusta la red `10.156.99.0/24` segun tu ambiente.

---

## 9) Troubleshooting HTTPS

### `curl: (7) Failed to connect ... port 443`

Caddy no esta escuchando en 443 o bind incorrecto.

```bash
$DC ps caddy
$DC logs --tail=160 caddy
sudo ss -lntp | grep -E ':80|:443'
grep -E '^(CADDY_PROFILE|CADDY_HTTPS_BIND|INTERNAL_HTTPS_IP)=' .env
```

### `curl: tlsv1 alert internal error`

Revisa Caddyfile/certificados:

```bash
$DC logs --tail=200 caddy
openssl x509 -in certs/internal/server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

Recrea Caddy:

```bash
$DC up -d --no-deps --force-recreate caddy
```

### Navegador sigue `Not secure`

Causas:

- No instalaste `ca.crt` en el cliente.
- Instalaste `server.crt` en vez de `ca.crt`.
- El navegador no se reinicio.
- Estas entrando por un nombre/IP que no esta en SAN.

### App abre por HTTP pero no por HTTPS

Prueba:

```bash
curl -I http://10.156.99.35
curl -k -I https://10.156.99.35
$DC logs --tail=160 caddy
```

---

## 10) Rollback Seguro A HTTP

No toca DB.

```bash
cd ~/apps/Bitacora_Grupos
cp .env ".env.rollback-internal-https-$(date +%F-%H%M%S)"

python3 - <<'PY'
from pathlib import Path

env_path = Path('.env')
values = {
    'CADDY_PROFILE': 'http',
    'INTERNAL_HTTPS_ENABLED': 'false',
    'COOKIE_SECURE': 'false',
}
lines = env_path.read_text().splitlines() if env_path.exists() else []
seen, out = set(), []
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

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC up -d --no-deps --force-recreate app caddy
$DC logs --tail=120 caddy
```

No borres certificados ni backups durante rollback.

---

## 11) Rotar CA

Solo si realmente necesitas invalidar la CA vieja:

```bash
bash scripts/generate-internal-certs.sh --rotate-ca \
  --ip 10.156.99.35 \
  --dns "bitacora.local,bitacora.interno,opsbitacora.local"
```

Despues debes instalar el nuevo `ca.crt` en todos los clientes.
