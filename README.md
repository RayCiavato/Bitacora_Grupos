# Bitacora (Docker + Seguridad + Observabilidad)

Manual de despliegue completo:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

## Novedades incorporadas

- Sesion segura con `HttpOnly cookies` + `refresh token` rotatorio.
- Roles: `admin`, `supervisor`, `funcionario`.
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
cp .env.example .env
```

Variables clave de seguridad/sesion:

- `JWT_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `AUTH_COOKIE_NAME`
- `REFRESH_COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`

Variables de negocio:

- `ALLOW_PUBLIC_REGISTRATION`
- `UPLOAD_DIR`
- `UPLOAD_MAX_BYTES`

Recordatorios opcionales:

- `REMINDER_ENABLED`
- `REMINDER_CRON`
- `REMINDER_TIMEZONE`
- `SMTP_*` o `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL`

## 2) Levantar plataforma

```bash
chmod +x scripts/*.sh
docker compose up -d --build
```

> El backend aplica migraciones idempotentes al iniciar (`ensureDatabaseSchema`).

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

- Cambiar `tls internal` por certificado real en `infra/Caddyfile`.
- Mantener `COOKIE_SECURE=true` en produccion.
- Programar prueba de restore mensual.
- Configurar correo/webhooks si se usan recordatorios.
