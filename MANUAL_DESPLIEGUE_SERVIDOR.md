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
cd ~/apps/bitacora
chmod +x scripts/*.sh
bash scripts/setup-env.sh --app-domain 10.156.99.34 --admin-email admin@tudominio.com
```

Si prefieres auto detectar IP del servidor:

```bash
bash scripts/setup-env.sh --admin-email admin@tudominio.com
```

El script genera automaticamente:

```env
APP_DOMAIN=10.156.99.34
POSTGRES_PASSWORD=<generado>
JWT_SECRET=<generado>
ADMIN_DEFAULT_PASSWORD=<generado>
GRAFANA_ADMIN_PASSWORD=<generado>
COOKIE_SECURE=true
ALLOW_PUBLIC_REGISTRATION=false
UPLOAD_DIR=/usr/src/app/uploads
```

Notas:
- El script imprime credenciales generadas al finalizar. Guardalas en un lugar seguro.
- Para regenerar `.env`, usa `--force`.
- `POSTGRES_PASSWORD` generado por script ya es URL-safe (`A-Za-z0-9_-`) y compatible con `DATABASE_URL`.
- Si defines `--db-password` manual, no uses `#`, `%`, `@`, `/`, `:`, `?` para evitar errores de conexion.

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

## 15) Hardening avanzado (paso a paso para novato)

Objetivo: dejar el servidor robusto contra fuerza bruta, errores de configuracion y abuso comun.

Importante antes de empezar:

1. Abre **dos sesiones SSH** al servidor. No cierres la segunda hasta terminar.
2. Ejecuta cada bloque y valida antes de pasar al siguiente.
3. Si cambias SSH, prueba login nuevo antes de cerrar la sesion actual.

### Fase 0 - Punto de retorno (rollback)

```bash
cd ~/apps/bitacora
git status
cp .env .env.backup.$(date +%F-%H%M%S)
docker compose ps > /tmp/bitacora-services-before.txt
```

Guardar estado de paquetes:

```bash
dpkg -l > /tmp/packages-before-hardening.txt
```

### Fase 1 - Usuario operativo y acceso SSH seguro

#### 1.1 Crear usuario de operacion (si aun no existe)

```bash
sudo adduser opsadmin
sudo usermod -aG sudo opsadmin
```

#### 1.2 Copiar tu llave SSH al nuevo usuario

En tu PC local:

```bash
ssh-copy-id opsadmin@<ip-servidor>
```

En servidor, revisar permisos:

```bash
sudo mkdir -p /home/opsadmin/.ssh
sudo chown -R opsadmin:opsadmin /home/opsadmin/.ssh
sudo chmod 700 /home/opsadmin/.ssh
sudo chmod 600 /home/opsadmin/.ssh/authorized_keys
```

#### 1.3 Endurecer SSH sin romper acceso

Editar:

```bash
sudo nano /etc/ssh/sshd_config
```

Ajustes recomendados:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
```

Validar y reiniciar SSH:

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo systemctl status ssh --no-pager
```

Desde tu PC, abre una nueva conexion y confirma que entra con llave:

```bash
ssh opsadmin@<ip-servidor>
```

### Fase 2 - Firewall (UFW) y puertos minimos

Politica base:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Si Grafana/Prometheus se usaran solo por tunel SSH, **no** abras 3001/9090/9093/3100 al mundo.

### Fase 3 - Antifuerza bruta (Fail2Ban)

Instalar:

```bash
sudo apt update
sudo apt install -y fail2ban
```

Configurar jail local:

```bash
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd
destemail = root@localhost
sender = fail2ban@localhost
mta = sendmail

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
EOF
```

Activar y validar:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Fase 4 - Parches de seguridad automaticos

```bash
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
```

Revisar configuracion:

```bash
sudo sed -n '1,220p' /etc/apt/apt.conf.d/50unattended-upgrades
sudo sed -n '1,220p' /etc/apt/apt.conf.d/20auto-upgrades
```

Prueba en modo simulacion:

```bash
sudo unattended-upgrade --dry-run --debug
```

### Fase 5 - Endurecer archivos sensibles del proyecto

```bash
cd ~/apps/bitacora
chmod 600 .env
chmod 600 infra/Caddyfile
chmod 700 scripts
chmod 700 scripts/*.sh
```

Verificar:

```bash
ls -la .env infra/Caddyfile scripts
```

### Fase 6 - Endurecer Docker en produccion

#### 6.1 Evitar exposicion accidental de puertos internos

Ya esta bien encaminado: varios servicios estan en `127.0.0.1`. Mantener esa practica.

Verifica puertos abiertos:

```bash
sudo ss -tulpn | grep -E ':80|:443|:3001|:9090|:9093|:3100|:5432'
```

Debe verse publico solo `80/443` (y `22` para SSH).

#### 6.2 No exponer Docker socket a contenedores

Comprobar:

```bash
docker compose config | grep -n "/var/run/docker.sock" || true
```

Si algun servicio monta el socket, removerlo salvo caso muy justificado.

#### 6.3 Escaneo basico de imagenes

Instalar Trivy:

```bash
sudo apt install -y wget gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update
sudo apt install -y trivy
```

Escanear imagenes:

```bash
docker images --format "{{.Repository}}:{{.Tag}}" | xargs -n1 trivy image --severity HIGH,CRITICAL
```

### Fase 7 - Sysctl de red (baseline seguro)

```bash
sudo tee /etc/sysctl.d/99-hardening.conf > /dev/null <<'EOF'
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.accept_source_route=0
net.ipv4.conf.default.accept_source_route=0
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.secure_redirects=0
net.ipv4.conf.default.secure_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv6.conf.default.accept_redirects=0
kernel.kptr_restrict=2
kernel.dmesg_restrict=1
EOF
sudo sysctl --system
```

Validar:

```bash
sysctl net.ipv4.tcp_syncookies kernel.kptr_restrict kernel.dmesg_restrict
```

### Fase 8 - Auditoria local y monitoreo de cambios

Instalar `auditd`:

```bash
sudo apt install -y auditd audispd-plugins
sudo systemctl enable --now auditd
```

Reglas minimas para vigilar archivos criticos:

```bash
sudo tee /etc/audit/rules.d/bitacora.rules > /dev/null <<'EOF'
-w /etc/ssh/sshd_config -p wa -k ssh_config_changes
-w /etc/passwd -p wa -k identity_changes
-w /etc/group -p wa -k identity_changes
-w /etc/sudoers -p wa -k sudoers_changes
-w /home/opsadmin/apps/bitacora/.env -p wa -k bitacora_env_changes
-w /home/opsadmin/apps/bitacora/docker-compose.yml -p wa -k compose_changes
EOF
sudo augenrules --load
sudo auditctl -l
```

Consultar eventos:

```bash
sudo ausearch -k bitacora_env_changes -i
```

Nota: ajusta la ruta `/home/opsadmin/apps/bitacora` segun tu usuario real.

### Fase 9 - Cifrado y acceso minimo en backups

#### 9.1 Permisos carpeta backups

```bash
cd ~/apps/bitacora
mkdir -p backups
chmod 700 backups
```

#### 9.2 Cifrar backup para sacar fuera del servidor (opcional recomendado)

Con `age`:

```bash
sudo apt install -y age
age-keygen -o ~/.config/age/keys.txt
chmod 600 ~/.config/age/keys.txt
```

Cifrar archivo:

```bash
age -r <PUBLIC_KEY_AGE> -o backups/backup-$(date +%F).sql.gz.age backups/<archivo>.sql.gz
```

### Fase 10 - Verificacion final de hardening

Checklist rapido:

1. `ufw status verbose` muestra solo `22/80/443`.
2. `fail2ban-client status sshd` activo.
3. `PasswordAuthentication no` aplicado en SSH.
4. `.env` con permisos `600`.
5. `docker compose ps` saludable.
6. `curl -I https://<APP_DOMAIN>` responde correctamente.
7. Puedes iniciar sesion y operar la app sin errores.

Comandos de comprobacion:

```bash
sudo ufw status verbose
sudo fail2ban-client status sshd
sudo grep -E "PermitRootLogin|PasswordAuthentication|PubkeyAuthentication" /etc/ssh/sshd_config
ls -l ~/apps/bitacora/.env
docker compose ps
curl -I https://<APP_DOMAIN>
```

### Fase 11 - Politica operativa recomendada

1. Nunca trabajar como `root` para operaciones diarias.
2. Rotar secretos (`JWT_SECRET`, passwords) cada 90 dias.
3. Revisar logs de `app`, `caddy`, `fail2ban` cada semana.
4. Restaurar un backup de prueba al menos 1 vez por mes.
5. Aplicar actualizaciones de seguridad del sistema en ventana controlada.
