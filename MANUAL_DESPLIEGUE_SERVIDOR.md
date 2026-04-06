# Manual De Despliegue En Servidor Ubuntu (BitacoraHardening)

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_gestor_tareas.git

Ruta recomendada en servidor:
- `~/apps/Bitacora_gestor_tareas`

---

## 1) Credenciales por defecto (para despliegue inicial)

Usa estas por defecto para levantar rapido:

- Admin email: `admin@n1njahack.local`
- Admin password: `N1njaHack@2026!`
- DB user: `bitacora_user`
- DB password: `BitacoraDB_2026`
- Grafana user: `admin`
- Grafana password: `GrafanaAdmin_2026`

Importante:
- La password admin debe cumplir complejidad (incluye mayuscula, minuscula, numero y especial).
- La password de DB conviene URL-safe (`A-Za-z0-9_-`) para evitar errores en `DATABASE_URL`.
- Cambia credenciales despues del primer acceso.

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
git clone git@github-bitacora:RayCiavato/Bitacora_gestor_tareas.git Bitacora_gestor_tareas
cd ~/apps/Bitacora_gestor_tareas
```

---

## 5) Despliegue limpio recomendado (evita errores previos)

Este flujo es para servidor nuevo o cuando quieres evitar mismatch de passwords DB.

```bash
cd ~/apps/Bitacora_gestor_tareas
chmod +x scripts/*.sh

bash scripts/install-server-safe.sh \
  --app-domain 10.0.210.43 \
  --admin-email admin@n1njahack.local \
  --admin-password 'N1njaHack@2026!' \
  --db-password 'BitacoraDB_2026' \
  --grafana-password 'GrafanaAdmin_2026' \
  --force
```

Que hace este script:
1. Genera `.env` consistente.
2. Hace `deploy-safe` con `--fresh-db` para evitar credenciales desalineadas.
3. Reprovisiona admin al final.

---

## 6) Verificacion post-despliegue

```bash
cd ~/apps/Bitacora_gestor_tareas
docker compose ps
docker compose logs --tail=150 app
docker compose logs --tail=100 caddy
curl -I http://127.0.0.1
curl -I http://10.156.99.15
```

Esperado:
- `bitacora-app` en `Up` (no `Restarting`).
- `curl` responde `200` o redireccion valida.
- Sin errores `password authentication failed`.

---

## 7) Actualizacion segura (sin borrar datos)

Para actualizar version en servidor ya productivo:

```bash
cd ~/apps/Bitacora_gestor_tareas
git config core.filemode false
git status --short
```

Si hay cambios locales:

```bash
git stash push -u -m "pre-deploy-$(date +%F-%H%M%S)"
```

Actualizar y desplegar:

```bash
git fetch --prune origin
git checkout main
git pull --ff-only origin main
bash scripts/deploy-safe.sh --pull
docker compose ps
docker compose logs --tail=120 app
```

---

## 8) Errores comunes y solucion rapida

### A) 502 Bad Gateway en navegador

Generalmente `app` esta reiniciando.

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=120 caddy
```

Si ves error de politica de password admin:

```bash
cd ~/apps/Bitacora_gestor_tareas
bash scripts/provision-admin.sh admin@n1njahack.local 'N1njaHack@2026!' 'Administrador N1njaHack'
docker compose restart app
```

### B) `password authentication failed for user "bitacora_user"`

La DB quedo inicializada con otro password.

Opcion segura (recomendada si puedes reiniciar DB):

```bash
cd ~/apps/Bitacora_gestor_tareas
docker compose down
docker volume rm bitacora_gestor_tareas_postgres_data
bash scripts/install-server-safe.sh \
  --app-domain 10.156.99.15 \
  --admin-email admin@n1njahack.local \
  --admin-password 'N1njaHack@2026!' \
  --db-password 'BitacoraDB_2026' \
  --grafana-password 'GrafanaAdmin_2026' \
  --force
```

### C) Ejecutaste comandos fuera del repo

Si ves `fatal: not a git repository` o `no configuration file provided`:

```bash
cd ~/apps/Bitacora_gestor_tareas
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
cd ~/apps/Bitacora_gestor_tareas
git stash push -u -m "pre-pull-$(date +%F-%H%M%S)"
git pull --ff-only origin main
```

### F) `Conflict. The container name ... is already in use`

Quedo un contenedor viejo con nombre fijo (por ejemplo `bitacora-node-exporter`) y Compose no puede recrearlo.

```bash
cd ~/apps/Bitacora_gestor_tareas
docker rm -f bitacora-node-exporter 2>/dev/null || true
bash scripts/deploy-safe.sh --fresh-db --ensure-admin --admin-email admin@n1njahack.local --admin-password 'N1njaHack@2026!'
```

Nota:
- Si haces `git pull` y actualizas a la version nueva de `deploy-safe.sh`, este conflicto se limpia automaticamente y se reintenta el deploy.

---

## 9) Checklist final

```bash
cd ~/apps/Bitacora_gestor_tareas
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

## 10) Comandos de operacion diaria

```bash
cd ~/apps/Bitacora_gestor_tareas
docker compose ps
docker compose logs -f app
docker compose restart app
bash scripts/check-latest-backup.sh
```

Restore de backup:

```bash
cd ~/apps/Bitacora_gestor_tareas
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```
