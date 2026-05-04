# Bitacora (Docker + Seguridad + Observabilidad)

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_gestor_tareas.git

Guia principal de despliegue:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

Guia de hardening:
- [HARDENING_PASO_A_PASO_NOVATOS.md](HARDENING_PASO_A_PASO_NOVATOS.md)

Guia HTTPS interno con CA propia:
- [docs/HTTPS_INTERNO_CA.md](docs/HTTPS_INTERNO_CA.md)

---

## Credenciales por defecto (despliegue inicial)

- Admin email: `admin@n1njahack.local`
- Admin password: `N1njaHack@2026!`
- DB password: `BitacoraDB_2026`
- Grafana user: `admin`
- Grafana password: `GrafanaAdmin_2026`

Cambia estas credenciales despues del primer login.

---

## Despliegue rapido recomendado

```bash
cd ~/apps/Bitacora_gestor_tareas
chmod +x scripts/*.sh

bash scripts/install-server-safe.sh \
  --app-domain 10.156.99.15 \
  --admin-email admin@n1njahack.local \
  --admin-password 'N1njaHack@2026!' \
  --db-password 'BitacoraDB_2026' \
  --grafana-password 'GrafanaAdmin_2026' \
  --force
```

Verifica:

```bash
docker compose ps
docker compose logs --tail=120 app
curl -I http://127.0.0.1
```

---

## Actualizacion segura (sin romper)

```bash
cd ~/apps/Bitacora_gestor_tareas
git config core.filemode false
git status --short
if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -m "pre-deploy-$(date +%F-%H%M%S)"
fi
git fetch --prune origin
git checkout main
git pull --ff-only origin main
bash scripts/deploy-safe.sh --pull
```

---

## Telegram interactivo sin dominio publico

Para usar `/menu`, botones inline y `/buscar` dentro de un grupo privado sin HTTPS ni dominio publico,
activa long polling en el `.env` del servidor:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=REEMPLAZAR_TOKEN
TELEGRAM_CHAT_ID=REEMPLAZAR_CHAT_ID
TELEGRAM_BOT_INTERACTIVE_ENABLED=true
TELEGRAM_BOT_MODE=polling
TELEGRAM_POLLING_TIMEOUT=30
TELEGRAM_POLLING_INTERVAL_MS=1000
TELEGRAM_POLLING_ALLOWED_UPDATES=message,callback_query
```

Antes de iniciar polling, elimina cualquier webhook previo:

```bash
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

En modo `polling`, ejecuta una sola instancia de `app` para evitar doble lectura de updates.
El modo `webhook` sigue disponible para un futuro dominio HTTPS usando `TELEGRAM_BOT_MODE=webhook`.
