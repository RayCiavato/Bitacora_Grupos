# Hardening Paso A Paso Para Novatos

Este documento complementa el manual principal:

- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

Ruta recomendada:

```bash
~/apps/Bitacora_Grupos
```

Si vienes de una Bitacora vieja, puede que tu ruta productiva siga siendo:

```bash
~/apps/Bitacora_gestor_tareas
```

En ese caso usa tu ruta real para no cambiar volumenes Docker accidentalmente.

---

## 0) Lo Que Ya Trae La App

- Caddy delante de la app.
- App interna en `app:3000` sin exponer directamente.
- Cookies HttpOnly.
- JWT + refresh token.
- CSRF en mutaciones.
- Helmet + CSP restrictivo.
- Rate limit.
- Auditoria.
- RBAC por rol.
- ABAC por grupo/area.
- Telegram polling sin webhook publico.
- SSE/realtime autenticado y filtrado.
- Exportes protegidos por permiso de grupo.

---

## 1) Cuidar Secretos

Nunca subir a GitHub:

- `.env`
- backups `.sql`, `.dump`, `.gz`
- tokens Telegram
- `certs/internal/ca.key`
- `certs/internal/server.key`
- claves SSH privadas

Permisos recomendados:

```bash
cd ~/apps/Bitacora_Grupos  # o ruta productiva real
chmod 600 .env
chmod 700 ~/.ssh
chmod 600 ~/.ssh/bitacora_github ~/.ssh/config
```

---

## 2) Passwords Temporales Sin Errores

No dejes passwords fijas en GitHub. Si necesitas evitar errores de tipeo, genera secretos en el servidor:

```bash
cd ~/apps/Bitacora_Grupos
chmod +x scripts/*.sh

bash scripts/setup-env.sh \
  --app-domain 10.156.99.35 \
  --admin-email admin@n1njahack.local \
  --admin-name "Administrador Principal" \
  --force

bash scripts/deploy-safe.sh --ensure-admin

grep -E '^(ADMIN_DEFAULT_EMAIL|ADMIN_DEFAULT_PASSWORD|POSTGRES_PASSWORD|GRAFANA_ADMIN_PASSWORD)=' .env
```

Anota la password inicial en un gestor seguro y cambiala despues del primer acceso.

---

## 3) Firewall Basico

Si la app es interna, permite solo la red interna.

Ejemplo con UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow from 10.156.99.0/24 to any port 80 proto tcp
sudo ufw allow from 10.156.99.0/24 to any port 443 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Ajusta `10.156.99.0/24` a tu red real.

---

## 4) SSH Mas Seguro

Antes de tocar SSH, abre dos sesiones para no quedarte fuera.

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%F-%H%M%S)
sudo nano /etc/ssh/sshd_config
```

Valores recomendados:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
```

Validar:

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo systemctl status ssh --no-pager
```

---

## 5) Anti Brute Force

```bash
sudo apt update
sudo apt install -y fail2ban
```

Configurar:

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

sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## 6) Actualizaciones De Seguridad

```bash
sudo apt update
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
sudo unattended-upgrade --dry-run --debug
```

Programa reinicios en ventana de mantenimiento si Ubuntu indica `System restart required`.

---

## 7) Backups

Backup manual seguro:

```bash
cd ~/apps/Bitacora_Grupos  # o ruta productiva real
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

mkdir -p backups/manual
sudo chown -R "$USER:$USER" backups
POSTGRES_USER_VALUE="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"

$DC exec -T postgres pg_dump -U "${POSTGRES_USER_VALUE:-bitacora_user}" "${POSTGRES_DB_VALUE:-bitacora}" | gzip > "backups/manual/backup-$(date +%F-%H%M%S).sql.gz"
ls -lh backups/manual | tail
```

Verifica backups:

```bash
bash scripts/check-latest-backup.sh
```

Restore solo en ventana de mantenimiento:

```bash
bash scripts/restore-db.sh backups/manual/<archivo>.sql.gz
```

---

## 8) Endurecer Registro Y Sesion

Edita `.env`:

```bash
cd ~/apps/Bitacora_Grupos
cp .env .env.backup.$(date +%F-%H%M%S)

sed -i 's/^ALLOW_PUBLIC_REGISTRATION=.*/ALLOW_PUBLIC_REGISTRATION=false/' .env
sed -i 's/^MFA_REQUIRED=.*/MFA_REQUIRED=true/' .env
sed -i 's/^COOKIE_SAMESITE=.*/COOKIE_SAMESITE=strict/' .env
```

Recrear app:

```bash
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
$DC up -d --no-deps --force-recreate app
```

Nota: si usas HTTPS interno con CA instalada, puedes usar `COOKIE_SECURE=true`. Si sigues en HTTP interno, `COOKIE_SECURE=true` puede impedir login en algunos navegadores.

---

## 9) Seguridad Multi-Area

Despues de actualizar a Bitacora Grupos:

1. Entra como admin.
2. Abre Roles y permisos.
3. Revisa Grupos.
4. Asigna usuarios a su grupo correcto.
5. Revisa Matriz de visibilidad.
6. Verifica que Soporte no vea Infraestructura y viceversa.
7. Verifica que Seguridad Tecnologica vea solo lo que corresponde.
8. Verifica que Gerencia no tenga administracion tecnica total salvo decision explicita.

Comandos de validacion:

```bash
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT slug, is_active FROM groups ORDER BY id;"
$DC exec -T postgres psql -U "${POSTGRES_USER_VALUE:-bitacora_user}" -d "${POSTGRES_DB_VALUE:-bitacora}" -c "SELECT source_group_id, target_group_id, can_view, can_export, can_administer FROM group_access_policies ORDER BY source_group_id, target_group_id;"
```

---

## 10) Validacion De Puertos

```bash
sudo ss -ltnp | grep -E ':22|:80|:443|:3000|:5432'
```

Esperado:

- `22` SSH.
- `80/443` Caddy.
- `3000` no debe estar publicado hacia red externa.
- `5432` no debe estar publicado hacia red externa.

---

## 11) Validacion De App

```bash
cd ~/apps/Bitacora_Grupos
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

$DC ps
$DC logs --tail=120 app
curl -sS http://127.0.0.1/health
```

Validar en UI:

- Login.
- Dashboard.
- Tareas.
- Bitacoras.
- Adjuntos.
- Roles y permisos.
- Configuracion > Telegram.

---

## 12) Rutina Semanal

1. Revisar `docker compose ps`.
2. Revisar logs de `app` y `caddy`.
3. Confirmar backup reciente.
4. Revisar espacio en disco con `df -h`.
5. Revisar `docker system df`.
6. Validar que Telegram polling no tenga errores.
7. Revisar auditoria de permisos.

Comandos:

```bash
cd ~/apps/Bitacora_Grupos
$DC ps
$DC logs --tail=120 app
$DC logs --tail=80 caddy
df -h
docker system df
bash scripts/check-latest-backup.sh
```

---

## 13) Limpieza Segura

Permitido:

```bash
docker image prune -f
docker builder prune -f
```

Prohibido en produccion con data:

```bash
docker compose down -v
docker volume rm <volumen_postgres>
docker system prune --volumes
```
