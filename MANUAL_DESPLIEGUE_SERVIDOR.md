# Manual De Despliegue En Servidor (Proxmox + Ubuntu + Docker)

Este manual cubre el despliegue de Bitacora en un servidor productivo.

## 1) Arquitectura objetivo

- Host: Proxmox VE
- VM: Ubuntu Server 24.04 LTS
- Runtime: Docker + Docker Compose
- Servicios:
  - `app` (API Bitacora)
  - `postgres` (base de datos)
  - `backup` (backups automaticos)
  - `caddy` (reverse proxy HTTPS)
  - `prometheus`, `grafana`, `loki`, `promtail`, `alertmanager`

## 2) Requisitos minimos recomendados

- VM Ubuntu:
  - vCPU: 2 (ideal 4)
  - RAM: 4 GB (ideal 8 GB)
  - Disco: 60 GB (ideal 120 GB SSD)
  - Red: IP fija o reserva DHCP
- Dominio publico para la app (ejemplo: `bitacora.tudominio.com`)

## 3) Preparar VM en Proxmox

1. Crear VM Ubuntu Server 24.04 LTS.
2. Activar agente QEMU (opcional recomendado).
3. Asignar recursos minimos recomendados.
4. Instalar Ubuntu y crear usuario administrador.
5. Confirmar conectividad de red desde la VM.

## 4) Hardening basico de Ubuntu

Conectate por SSH y ejecuta:

```bash
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone <Region/Ciudad>
sudo apt -y install ufw fail2ban ca-certificates curl gnupg git rsync
```

Para ver zonas disponibles:

```bash
timedatectl list-timezones | grep -i -E "new_york|chicago|denver|los_angeles|mexico|bogota|lima"
```

Configurar firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 5) Instalar Docker y Compose

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 6) Publicar proyecto en servidor

Opcion A (Git):

```bash
mkdir -p ~/apps
cd ~/apps
git clone <TU_REPO_GIT> bitacora
cd bitacora
```

Opcion B (sin Git): copiar carpeta local al servidor con `scp`/`rsync`.

## 7) Configuracion de variables

```bash
cd ~/apps/bitacora
cp .env.example .env
```

Editar `.env`:

```env
APP_DOMAIN=bitacora.tudominio.com

POSTGRES_DB=bitacora
POSTGRES_USER=bitacora_user
POSTGRES_PASSWORD=<password_fuerte>

JWT_SECRET=<secreto_largo_min_32_chars>
JWT_EXPIRES_IN=12h
JWT_ISSUER=bitacora-api
JWT_AUDIENCE=bitacora-clients

ADMIN_DEFAULT_NAME=Administrador
ADMIN_DEFAULT_EMAIL=admin@tudominio.com
ADMIN_DEFAULT_PASSWORD=<password_admin_fuerte>

MAX_FAILED_ATTEMPTS=5
LOCK_MINUTES=15
PASSWORD_MIN_LENGTH=12
ALLOW_PUBLIC_REGISTRATION=true

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<password_grafana_fuerte>
```

## 8) Ajustar HTTPS de produccion

En [infra/Caddyfile](infra/Caddyfile) cambia:

```caddyfile
tls internal
```

por:

```caddyfile
tls admin@tudominio.com
```

Requisitos:

- DNS `A`/`AAAA` apuntando al servidor.
- Puertos 80 y 443 abiertos desde internet.

## 9) Levantar plataforma

```bash
cd ~/apps/bitacora
chmod +x scripts/*.sh
docker compose up -d --build
docker compose ps
```

Validaciones:

```bash
curl -I https://bitacora.tudominio.com
curl -s https://bitacora.tudominio.com/health
curl -s https://bitacora.tudominio.com/ready
docker compose logs --tail=50 app
docker compose logs --tail=50 caddy
```

## 10) Primer acceso seguro (MFA admin)

1. Login:

```bash
curl -s -X POST https://bitacora.tudominio.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tudominio.com","password":"<ADMIN_DEFAULT_PASSWORD>"}'
```

2. Obtendras `setupToken`.
3. Configura MFA:

```bash
curl -s -X POST https://bitacora.tudominio.com/auth/mfa/setup \
  -H "Authorization: Bearer <setupToken>"
```

4. Escanea QR y habilita:

```bash
curl -s -X POST https://bitacora.tudominio.com/auth/mfa/enable \
  -H "Authorization: Bearer <setupToken>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'
```

## 10.1) Registro de usuarios nuevos

La plataforma permite registro de nuevos usuarios (rol `funcionario`) con:

```bash
curl -s -X POST https://bitacora.tudominio.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Usuario Nuevo",
    "email":"nuevo@tudominio.com",
    "password":"C0ntrasena!Segura2026"
  }'
```

## 10.2) Admin reinicia/asigna contrasenas

Con token de administrador:

```bash
curl -s -X PATCH https://bitacora.tudominio.com/users/<userId>/password \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"Nuev@ClaveSegura2026"}'
```

## 11) Migracion de esquema (si vienes de version anterior)

Si ya tenias la tabla de eventos antigua:

```bash
cd ~/apps/bitacora
bash scripts/migrate-events-fields.sh
bash scripts/migrate-security.sh
```

## 12) Backups y prueba de restore

Verificar ultimo backup:

```bash
cd ~/apps/bitacora
bash scripts/check-latest-backup.sh
```

Restore manual:

```bash
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```

Politica recomendada:

- Probar restore 1 vez por mes en entorno de prueba.
- Copiar backup a almacenamiento externo (NAS/S3).

## 13) Observabilidad y alertas

URLs por defecto:

- Prometheus (solo en servidor): `http://127.0.0.1:9090`
- Alertmanager (solo en servidor): `http://127.0.0.1:9093`
- Grafana (solo en servidor): `http://127.0.0.1:3001`
- Loki (solo en servidor): `http://127.0.0.1:3100`

Antes de produccion:

1. Deja esos puertos sin exposicion publica (ya vienen atados a localhost en Compose).
2. Para acceso remoto usa tunel SSH, ejemplo Grafana:

```bash
ssh -L 3001:127.0.0.1:3001 <usuario>@<ip-servidor>
```

3. Configurar receptor real en [monitoring/alertmanager.yml](monitoring/alertmanager.yml).

Nota de seguridad importante:
- Docker publica puertos con reglas propias. No dependas solo de UFW para proteger servicios internos.
- `/metrics` no se publica por Caddy; se usa solo para scrape interno de Prometheus.

## 14) Actualizacion de plataforma

```bash
cd ~/apps/bitacora
git pull
docker compose up -d --build
docker image prune -f
```

Si hay cambios de base de datos, aplicar migraciones antes de exponer usuarios.

## 15) Comandos utiles de operacion

Ver estado:

```bash
docker compose ps
```

Ver logs API:

```bash
docker compose logs -f app
```

Reiniciar servicio:

```bash
docker compose restart app
```

Parar todo:

```bash
docker compose down
```

## 16) Checklist final de salida a produccion

1. `.env` con secretos fuertes y unicos.
2. HTTPS publico valido (sin `tls internal`).
3. MFA admin habilitado.
4. Backups diarios verificando archivo reciente.
5. Alertas funcionales con destino real.
6. Monitoreo solo por localhost o VPN + tunel SSH.
7. Prueba de login, creacion de usuario y registro de bitacora completada.
