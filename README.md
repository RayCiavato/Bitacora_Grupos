# Bitacora (Docker + Seguridad + Observabilidad)

Manual de despliegue completo:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

## Novedades incorporadas

- Sesion segura con `HttpOnly cookies` + `refresh token` rotatorio.
- Roles: `admin`, `supervisor`, `funcionario`.
- El usuario `admin` no se bloquea por intentos fallidos.
- Auditoria en BD (`audit_logs`) y endpoint de consulta.
- Reportes con filtros avanzados, paginacion y export (`CSV`, `XLSX`, `PDF`).
- Adjuntos por registro de bitacora.
- Plantillas de actividad reutilizables.
- Tendencias del rango (por dia, prioridad, top encargados).
- Recordatorios diarios (SMTP/Slack/Teams) opcionales.
- PWA (instalable en movil/escritorio) con soporte offline basico.
- Base de calidad: `ESLint` + tests API (`node:test` + `supertest`).

## Stack

- API: Node.js + Express
- BD: PostgreSQL 16
- Reverse proxy TLS: Caddy
- Backups: `prodrigestivill/postgres-backup-local`
- Observabilidad: Prometheus + Grafana + Loki + Promtail + Alertmanager

## 1) Configuracion inicial

```bash
chmod +x scripts/*.sh
bash scripts/setup-env.sh --app-domain 10.156.99.34 --admin-email admin@n1njahack.local --admin-password 'N1njaHack@2026!' --db-password 'BitacoraDB_2026' --force
```

Si prefieres auto-deteccion de IP del servidor:

```bash
bash scripts/setup-env.sh --admin-password 'N1njaHack@2026!' --db-password 'BitacoraDB_2026' --force
```

El script genera secretos fuertes y deja:

- `CADDY_PROFILE=http` + `COOKIE_SECURE=false` cuando `APP_DOMAIN` es IP/localhost.
- `CADDY_PROFILE=https` + `COOKIE_SECURE=true` cuando `APP_DOMAIN` es dominio.
- `ALLOW_PUBLIC_REGISTRATION=true`
- `UPLOAD_DIR=/usr/src/app/uploads` (persistente)
- `POSTGRES_PASSWORD` URL-safe (`A-Za-z0-9_-`) para no romper `DATABASE_URL`
- `MFA_REQUIRED=true` (MFA obligatorio para todas las cuentas; si una cuenta aun no lo activo, el sistema exige enrolamiento antes de permitir acceso)

Para instalacion nueva en servidor (flujo recomendado, sin choques de passwords/volumenes):

```bash
chmod +x scripts/*.sh
bash scripts/install-server-safe.sh \
  --app-domain 10.156.99.34 \
  --admin-email admin@n1njahack.local \
  --admin-password 'N1njaHack@2026!' \
  --db-password 'BitacoraDB_2026' \
  --force
```

Si defines `--db-password` manual, evita caracteres reservados de URL como `#`, `%`, `@`, `/`, `:`, `?`.

## Acceso admin inmediato

Crear o resetear admin en caliente (incluye desbloqueo y reinicio de MFA):

```bash
bash scripts/provision-admin.sh
```

Credenciales por defecto del script:

- Correo: `admin@n1njahack.local`
- Contrasena: `N1njaHack@2026!`

Estas credenciales aplican solo despues de ejecutar `scripts/provision-admin.sh`.

Tambien puedes definir las tuyas:

```bash
bash scripts/provision-admin.sh admin@tu-dominio.com 'TuPasswordSegura@2026' 'Administrador Principal'
```

## 2) Levantar plataforma

```bash
chmod +x scripts/*.sh
docker compose up -d --build
```

Si tu servidor no reconoce `docker compose`, instala el plugin oficial:

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version
```

No uses `docker-compose v1` (legacy), porque puede generar errores como `KeyError: 'ContainerConfig'`.

> El backend aplica migraciones idempotentes al iniciar (`ensureDatabaseSchema`).

Despliegue seguro recomendado (valida `.env` antes de levantar):

```bash
chmod +x scripts/*.sh
bash scripts/deploy-safe.sh --pull
```

Opciones utiles:
- `--fresh-db`: reinicia volumenes (solo para instalacion nueva o cuando no necesitas conservar datos).
- `--ensure-admin`: reprovisiona admin al final.
- `--no-build`: despliegue mas rapido sin rebuild.

## 2.1) Flujo recomendado de actualizacion en servidor (sin errores previos)

Usa este flujo cuando ya tienes la app corriendo y quieres actualizar sin romper nada:

### Paso 1: entrar al proyecto y validar estado

```bash
cd ~/apps/bitacora
git status --short
docker compose version
```

Si `docker compose version` falla, instala plugin:

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version
```

### Paso 2: evitar conflicto de cambios locales al hacer pull

Si `git status --short` muestra archivos modificados y quieres conservarlos:

```bash
git stash push -u -m "tmp-server-before-pull-$(date +%F-%H%M%S)"
```

### Paso 3: desplegar con script seguro

```bash
chmod +x scripts/*.sh
bash scripts/deploy-safe.sh --pull
```

Este script:
- corta si detecta cambios locales sin guardar (para no pisarlos),
- hace `git pull --ff-only`,
- levanta stack en modo seguro,
- y muestra `ps` + logs del `app`.

### Paso 4: validar version y estado

```bash
git rev-parse --short HEAD
docker compose ps
docker compose logs --tail=120 app
```

### Paso 5: validacion rapida anti-regresion

```bash
curl -I http://127.0.0.1/health
curl -I http://127.0.0.1/app.js
curl -I http://127.0.0.1/preview-dashboard.html
```

Esperado:
- `/health` responde `200` o `301/308` segun proxy.
- `/app.js` responde `404`.
- `/preview-dashboard.html` responde `404`.

## 2.2) Si aparece un error conocido

### Error: `docker: 'compose' is not a docker command`

```bash
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version
```

### Error: `permission denied` contra `/var/run/docker.sock`

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
id -nG
docker ps
```

### Error: `Your local changes would be overwritten by merge`

```bash
git stash push -u -m "tmp-before-pull-$(date +%F-%H%M%S)"
bash scripts/deploy-safe.sh --pull
```

### Error: `KeyError: 'ContainerConfig'`

Suele ser por Compose legacy o estado viejo de contenedores:

```bash
cd ~/apps/bitacora
docker compose down --remove-orphans
docker compose build --no-cache app
docker compose up -d --force-recreate app caddy
docker compose ps
```

### Error app reinicia por password admin

La politica exige password robusta con caracter especial.
Ejemplo valido: `N1njaHack@2026!`

Reprovisionar admin:

```bash
cd ~/apps/bitacora
bash scripts/provision-admin.sh admin@n1njahack.local 'N1njaHack@2026!' 'Administrador Principal'
docker compose restart app
docker compose logs --tail=80 app
```

Servicios principales:

- API via HTTPS: `https://<APP_DOMAIN>`
- Prometheus: `http://127.0.0.1:9090`
- Alertmanager: `http://127.0.0.1:9093`
- Grafana: `http://127.0.0.1:3001`
- Loki: `http://127.0.0.1:3100`

## 3) Endpoints principales

Autenticacion / sesion:

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/password/recover` (recuperacion por `email + MFA + nueva contrasena`)
- `POST /auth/mfa/setup`
- `POST /auth/mfa/enable`

Usuarios / auditoria:

- `POST /users` (admin)
- `GET /users` (admin/supervisor)
- `PATCH /users/:id/password` (admin)
- `GET /audit` (admin/supervisor)

Bitacora:

- `POST /events`
- `GET /events/report?from=YYYY-MM-DD&to=YYYY-MM-DD&q=&priority=&encargadoId=&page=&pageSize=`
- `GET /events/report/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|xlsx|pdf`
- `GET /events/trends?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /events/dashboard?days=30`
- `POST /events/:id/attachments`
- `GET /events/:id/attachments`
- `GET /events/attachments/:attachmentId/download`

Plantillas:

- `GET /templates`
- `POST /templates` (admin/supervisor)
- `PATCH /templates/:id` (admin/supervisor)
- `DELETE /templates/:id` (admin/supervisor)

Salud / metricas:

- `GET /health`
- `GET /ready`
- `GET /metrics` (interno)

## 4) Calidad de codigo

Dentro de `app/`:

```bash
npm run lint
npm test
```

## 5) Backups

- El servicio `backup` ejecuta dump diario en `./backups`.
- Retencion: 14 dias, 8 semanas, 12 meses.

Verificar backup reciente:

```bash
bash scripts/check-latest-backup.sh
```

Restaurar backup:

```bash
bash scripts/restore-db.sh backups/<archivo>.sql.gz
```

## Produccion recomendada

- Para dominio publico, editar `infra/Caddyfile.https` y cambiar `tls internal` por certificado real.
- Mantener `COOKIE_SECURE=true` en produccion.
- Programar prueba de restore mensual.
- Configurar correo/webhooks si se usan recordatorios.
