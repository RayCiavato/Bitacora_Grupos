# Bitacora (Docker + Seguridad + Observabilidad)

Repositorio oficial:
- https://github.com/RayCiavato/Bitacora_gestor_tareas.git

Guia principal de despliegue:
- [MANUAL_DESPLIEGUE_SERVIDOR.md](MANUAL_DESPLIEGUE_SERVIDOR.md)

Guia de hardening:
- [HARDENING_PASO_A_PASO_NOVATOS.md](HARDENING_PASO_A_PASO_NOVATOS.md)

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
