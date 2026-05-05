# Hardening Paso A Paso (Guia Para Novatos)

Este documento complementa el despliegue de:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

Ruta de trabajo usada en este proyecto:
- `~/apps/Bitacora_gestor_tareas`

---

## 0) Base actual (ya aplicada)

- Backend detras de Caddy (sin exponer puerto app al exterior).
- Cookies seguras + JWT + refresh token.
- Roles: `admin`, `supervisor`, `funcionario`.
- MFA soportado.
- Auditoria en BD.
- Protecciones anti-enumeracion de rutas internas.
- Exportes y adjuntos con controles de seguridad.

---

## 0.1) Credenciales temporales sin quemarlas en GitHub

- No se guardan passwords reales por defecto en el repositorio.
- Para evitar errores de tipeo, genera secretos temporales con `scripts/setup-env.sh` en el servidor.
- Las credenciales generadas viven solo en `.env`; ese archivo no debe subirse a GitHub.
- Cambia la password temporal del admin despues del primer acceso.
- Si usas una password temporal manual, pasala solo como argumento del script en el servidor.

Comando recomendado:

```bash
cd ~/apps/Bitacora_gestor_tareas
bash scripts/setup-env.sh --app-domain 10.156.99.35 --admin-email admin@n1njahack.local --force
bash scripts/deploy-safe.sh --ensure-admin
```

---

## 1) Quick wins de seguridad (sin romper)

### 1.1 Endurecer .env en produccion

```bash
cd ~/apps/Bitacora_gestor_tareas
cp .env .env.backup.$(date +%F-%H%M%S)

sed -i 's/^ALLOW_PUBLIC_REGISTRATION=.*/ALLOW_PUBLIC_REGISTRATION=false/' .env
sed -i 's/^MFA_REQUIRED=.*/MFA_REQUIRED=true/' .env
sed -i 's/^COOKIE_SAMESITE=.*/COOKIE_SAMESITE=strict/' .env

bash scripts/deploy-safe.sh --no-build
```

### 1.2 Verificar app viva

```bash
docker compose ps
docker compose logs --tail=120 app
curl -I http://127.0.0.1
```

---

## 2) Perimetro de red minimo

Solo deja abiertos:
- `22/tcp` (SSH)
- `80/tcp` (HTTP)
- `443/tcp` (HTTPS)

Si usas UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

---

## 3) SSH mas seguro (sin perder acceso)

Antes de tocar SSH, abre 2 sesiones.

```bash
sudo nano /etc/ssh/sshd_config
```

Recomendado:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
```

Validar y reiniciar:

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo systemctl status ssh --no-pager
```

---

## 4) Anti brute force

```bash
sudo apt update
sudo apt install -y fail2ban
```

Archivo local:

```bash
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
EOF
```

Activar:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## 5) Actualizaciones de seguridad automaticas

```bash
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
sudo unattended-upgrade --dry-run --debug
```

---

## 6) Permisos en archivos sensibles

```bash
cd ~/apps/Bitacora_gestor_tareas
chmod 600 .env
chmod 600 infra/Caddyfile.http infra/Caddyfile.https
chmod 700 scripts
chmod 700 scripts/*.sh
```

---

## 7) Validaciones finales

```bash
cd ~/apps/Bitacora_gestor_tareas
sudo ss -ltnp | grep -E ':22|:80|:443|:3000|:5432'
docker compose ps
docker compose logs --tail=80 app
curl -I http://127.0.0.1
```

Esperado:
- Publico: solo `80/443`.
- `bitacora-app` en `Up`.
- Sin errores de credenciales DB/admin.

---

## 8) Politica operativa recomendada

1. No trabajar como root en operaciones diarias.
2. Rotar secretos cada 90 dias.
3. Revisar logs de `app` y `caddy` semanalmente.
4. Verificar backup diario y restore mensual.
5. Desplegar siempre con `scripts/deploy-safe.sh`.
