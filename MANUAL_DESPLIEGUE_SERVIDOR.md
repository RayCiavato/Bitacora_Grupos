# Manual De Despliegue En Ubuntu Server (Docker Ya Instalado)

Este manual esta optimizado para tu caso: servidor Ubuntu ya con Docker/Compose, acceso por SSH desde MobaXterm y repositorio privado en GitHub (`RayCiavato/bitacora`).

## 1) Conexion al servidor desde MobaXterm

Conecta por SSH:

```bash
ssh <usuario>@<ip-servidor>
```

Verifica que estas en el servidor correcto:

```bash
whoami
hostname
uname -a
```

## 2) Verificacion rapida de prerequisitos

```bash
docker --version
docker compose version
git --version
```

Si `git` no existe:

```bash
sudo apt update
sudo apt install -y git
```

## 3) Acceso al repo privado en GitHub

### Opcion recomendada: clave SSH (deploy key)

En el servidor Ubuntu:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "bitacora-server" -f ~/.ssh/bitacora_github -N ""
cat ~/.ssh/bitacora_github.pub
```

1. Copia la salida de `cat`.
2. Ve a GitHub -> `RayCiavato/bitacora` -> `Settings` -> `Deploy keys` -> `Add deploy key`.
3. Pega la clave publica.
4. Marca **Allow write access** solo si vas a hacer push desde servidor (si no, dejalo solo lectura).

Configura SSH:

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

## 4) Clonar proyecto en el servidor

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github-bitacora:RayCiavato/bitacora.git
cd bitacora
```

## 5) Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Valores minimos obligatorios para produccion:

```env
APP_DOMAIN=bitacora.tudominio.com

POSTGRES_DB=bitacora
POSTGRES_USER=bitacora_user
POSTGRES_PASSWORD=<PASSWORD_DB_FUERTE>

JWT_SECRET=<SECRETO_LARGO_32+>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
AUTH_COOKIE_NAME=bitacora_access
REFRESH_COOKIE_NAME=bitacora_refresh
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

ADMIN_DEFAULT_NAME=Administrador
ADMIN_DEFAULT_EMAIL=admin@tudominio.com
ADMIN_DEFAULT_PASSWORD=<PASSWORD_ADMIN_FUERTE>

ALLOW_PUBLIC_REGISTRATION=false

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<PASSWORD_GRAFANA_FUERTE>

UPLOAD_DIR=/usr/src/app/uploads
UPLOAD_MAX_BYTES=10485760

REMINDER_ENABLED=false
```

Notas:
- `COOKIE_SECURE=true` en produccion (HTTPS real).
- Si no quieres registro publico, usa `ALLOW_PUBLIC_REGISTRATION=false`.

## 6) Configurar HTTPS en Caddy

Editar:

```bash
nano infra/Caddyfile
```

Si tienes dominio publico y DNS apuntando al servidor, cambia:

```caddyfile
tls internal
```

por:

```caddyfile
tls admin@tudominio.com
```

Asegurate de tener abiertos `80` y `443` en firewall/router.

## 7) Levantar la plataforma con Docker Compose

```bash
cd ~/apps/bitacora
chmod +x scripts/*.sh
docker compose up -d --build
docker compose ps
```

## 8) Verificacion post-despliegue

Con TLS real:

```bash
curl -I https://bitacora.tudominio.com
curl -s https://bitacora.tudominio.com/health
curl -s https://bitacora.tudominio.com/ready
```

Si aun usas `tls internal` (certificado interno), prueba con `-k`:

```bash
curl -k -I https://<ip-o-dominio>
curl -k -s https://<ip-o-dominio>/health
```

Logs utiles:

```bash
docker compose logs --tail=100 app
docker compose logs --tail=100 caddy
```

## 9) Primer acceso y MFA del admin

1. Abre en navegador: `https://<APP_DOMAIN>`.
2. Inicia sesion con `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD`.
3. El sistema te pedira configurar MFA (QR).
4. Escanea con Google Authenticator/Authy y confirma el codigo.

## 10) Operacion diaria

Ver estado:

```bash
docker compose ps
```

Ver logs API en vivo:

```bash
docker compose logs -f app
```

Reiniciar API:

```bash
docker compose restart app
```

Parar todo:

```bash
docker compose down
```

### Recuperar o crear admin rapido

Desde la raiz del proyecto en el servidor:

```bash
cd ~/apps/bitacora
bash scripts/provision-admin.sh
```

Credenciales por defecto del script:

- Correo: `admin@n1njahack.local`
- Contrasena: `N1njaHack@2026!`

Personalizar credenciales:

```bash
bash scripts/provision-admin.sh admin@tudominio.com 'TuPasswordSegura@2026' 'Administrador Principal'
```

Este proceso reinicia MFA del admin para forzar una configuracion nueva al siguiente login.

## 11) Actualizar version en servidor

```bash
cd ~/apps/bitacora
git pull
docker compose up -d --build
docker image prune -f
```

## 12) Backups y restore

Verificar ultimo backup:

```bash
cd ~/apps/bitacora
bash scripts/check-latest-backup.sh
```

Restaurar backup:

```bash
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```

## 13) Solucion de problemas comunes

### A) `git clone` falla con permisos a repo privado
- Revisa deploy key en GitHub.
- Verifica `~/.ssh/config` y prueba:

```bash
ssh -T github-bitacora
```

### B) `docker compose up` falla por puertos ocupados
Verifica procesos usando 80/443:

```bash
sudo ss -tulpn | grep -E ':80|:443'
```

### C) API no responde

```bash
docker compose logs --tail=200 app
cat .env
```

Valida especialmente `DATABASE_URL` (se arma desde compose), `JWT_SECRET`, `POSTGRES_PASSWORD`.

### D) Error de certificados HTTPS
- Asegura DNS correcto al servidor.
- Puertos 80/443 abiertos.
- En pruebas internas usa temporalmente `tls internal`.

## 14) Checklist final

1. Repo privado clonado correctamente desde servidor.
2. `.env` con secretos fuertes.
3. HTTPS funcional en `https://<APP_DOMAIN>`.
4. Login admin + MFA completado.
5. `docker compose ps` sin servicios caidos.
6. Backup generado y verificado.
7. Prueba de crear registro de bitacora exitosa.
