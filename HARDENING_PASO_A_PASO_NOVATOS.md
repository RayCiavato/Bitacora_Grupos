# Hardening Paso A Paso (Guia Para Novatos)

Objetivo: endurecer seguridad y rendimiento sin romper funcionalidades actuales.
Enfoque: cambios pequenos, medibles y con rollback en cada paso.

## 0) Lo Que Ya Esta Bien En Tu Proyecto

- `app` no publica puerto al host en `docker-compose.yml` (solo accesible por `caddy`).
- `app` corre con `read_only`, `tmpfs`, `no-new-privileges` y `cap_drop: ALL`.
- Headers de seguridad en `infra/Caddyfile*`.
- MFA y politica de password ya implementadas en backend.
- Auditoria (`audit_logs`) y monitoreo (Prometheus/Grafana/Loki) activos.

## 1) Respuesta Rapida A Tu Duda (Backend "Oculto")

El backend no se puede "ocultar" al 100% si el frontend lo usa, porque el navegador siempre hace requests a algun endpoint.
Lo correcto es:

- No exponer puerto directo del backend al internet (ya lo cumples).
- Forzar autenticacion/autorizacion fuerte.
- Filtrar y limitar requests (rate limit, WAF, firewall).
- No filtrar datos sensibles en respuestas/logs.

Conclusion: vamos bien en arquitectura (cliente -> caddy -> app). Hay que reforzar controles.

## 2) Hallazgos Clave Detectados

- `docker-compose.yml`: `MFA_REQUIRED` tiene fallback `false` (riesgo de despliegue inseguro si `.env` falla).
- `docker-compose.yml` / `.env`: `ALLOW_PUBLIC_REGISTRATION=true` puede abrir superficie innecesaria en produccion.
- Consultas de reportes y auditoria pueden degradar con volumen alto (faltan indices compuestos para filtros reales).
- Falta rutina explicita de mantenimiento DB (`VACUUM/ANALYZE` operativo y limpieza de `refresh_tokens` expirados).
- En servidor nuevo puede caer en `docker-compose` legacy (v1) con errores de recreacion.

## 3) Plan Por Fases (Sin Romper Nada)

## Fase 1 - Quick Wins (Hoy)

Objetivo: cerrar riesgos altos sin tocar logica funcional.

1. Endurecer variables de entorno en produccion:

```bash
cd ~/apps/bitacora
cp .env .env.backup.$(date +%F-%H%M%S)

# Recomendado en produccion:
sed -i 's/^ALLOW_PUBLIC_REGISTRATION=.*/ALLOW_PUBLIC_REGISTRATION=false/' .env
sed -i 's/^MFA_REQUIRED=.*/MFA_REQUIRED=true/' .env
sed -i 's/^COOKIE_SAMESITE=.*/COOKIE_SAMESITE=strict/' .env
```

2. Reiniciar solo app:

```bash
docker-compose up -d --no-deps --force-recreate app
docker-compose logs --tail=80 app
```

3. Validar:

```bash
curl -s http://127.0.0.1/health
curl -s http://127.0.0.1/ready
```

Rollback rapido:

```bash
cp .env.backup.<timestamp> .env
docker-compose up -d --no-deps --force-recreate app
```

## Fase 2 - Perimetro De Red (Hoy)

Objetivo: reducir superficie expuesta.

1. Mantener solo puertos necesarios abiertos en host:
- 22/tcp (SSH)
- 80/tcp y 443/tcp (web)

2. Si usas UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

3. Confirmar que backend no esta publicado:

```bash
docker-compose ps
# app NO debe mostrar mapeo 0.0.0.0:3000->...
```

## Fase 3 - Optimizacion De Base De Datos (Sin Tocar Data)

Objetivo: mejorar performance de lectura con volumen alto.

1. Crear indices compuestos para queries reales:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_report_main
ON events (fecha DESC, encargado_id, prioridad, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action_created
ON audit_logs (action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_active
ON refresh_tokens (user_id, revoked_at, expires_at DESC);
```

2. Actualizar estadisticas:

```sql
ANALYZE events;
ANALYZE audit_logs;
ANALYZE refresh_tokens;
```

3. Validar mejora:
- Medir `/events/report` antes/despues con mismo rango.
- Revisar `EXPLAIN (ANALYZE, BUFFERS)` en consultas lentas.

Importante: `CONCURRENTLY` evita bloqueo duro de escritura.

## Fase 4 - Rendimiento Aplicacion (Semana 1)

Objetivo: sostener carga sin cambiar framework.

1. Mantener Node/Express actual (no migrar framework aun).
2. Agregar pruebas de carga baseline:
- `k6` o `autocannon` sobre `/auth/login`, `/events/report`, `/events/dashboard`.
3. Definir SLO inicial:
- p95 `< 400ms` en reportes paginados.
- error rate `< 1%`.
4. Ajustar limites:
- `pageSize` ya tiene max `500`; en produccion recomendar `<=200` si crece mucho.

Decision tecnica: cambiar de framework ahora no da mejor ROI que tunear DB + despliegue.

## Fase 5 - Hardening Operativo (Semana 1-2)

1. Parches y ciclo de vida:
- Actualizar imagenes base regularmente.
- Escaneo de vulnerabilidades en pipeline (`trivy`).

2. Secretos:
- Rotacion trimestral de `JWT_SECRET`, `POSTGRES_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`.
- Nunca loggear secretos (ya tienes redaccion en `logger.js`).

3. Observabilidad de seguridad:
- Alerta por reinicios de `app`.
- Alerta por tasa alta de `401/403/429`.
- Prueba mensual de restore de backup.

## 4) Archivos Prioritarios A Tocar En Las Siguientes Iteraciones

- `docker-compose.yml`
- `.env` (solo en servidor)
- `db/init/001_schema.sql` y nueva migracion de indices
- `app/src/routes/events.js` (si ajustamos paginacion o export grande)
- `monitoring/alerts.yml` (nuevas alertas de seguridad/rendimiento)
- `MANUAL_DESPLIEGUE_SERVIDOR.md` (checklist operativo final)

## 5) Orden Recomendado De Ejecucion

1. Fase 1 (quick wins env).
2. Fase 2 (firewall/perimetro).
3. Fase 3 (indices y ANALYZE).
4. Fase 4 (baseline de carga y tuning fino).
5. Fase 5 (operacion continua).

---

Si seguimos este orden, subimos mucho la seguridad y el rendimiento sin romper lo que ya funciona.
