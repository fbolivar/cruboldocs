# Arquitectura — API de escritura + Webhooks

**Producto:** CrubolDocs · **Feature:** v1.4-1 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (Route Handlers) + TypeScript · Supabase (service role, server-only) · Upstash · Vercel Cron.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** la API de lectura (v1.3) permite **consumir** datos; falta **enviar** datos a CrubolDocs y **notificar** a sistemas externos cuando algo ocurre. La profundidad de integración (escritura + webhooks) es *el* diferenciador QMS 2026.
- **Acción de valor:** (a) **escribir** por API un conjunto curado de registros; (b) **webhooks** salientes firmados que avisan a un sistema externo cuando se crean esos registros.
- **Decisiones (Fernando, 2026-11-11):** escritura **curada** (reportar NC, registrar medición de indicador, crear PQRS, crear salida no conforme) reusando las RPC; webhooks para los **4 eventos de creación**; entrega **con cola, intento inmediato, reintentos y firma HMAC**; **Idempotency-Key** en la escritura.

## 2. Modelo / técnica
Reusa `api_keys` (v1.3); agrega **scopes de escritura**, 3 tablas y disparadores.

### Escritura (ADR-081)
- **Nuevos scopes:** `write:nonconformities`, `write:indicators`, `write:pqrs`, `write:nonconforming_outputs` (se amplía el catálogo validado en `create_api_key` y en la UI).
- **Endpoints:** `POST /api/v1/{nonconformities,indicator-measurements,pqrs,nonconforming-outputs}`. Auth Bearer + scope de escritura.
- **Funciones `api_*` dedicadas** (SECURITY DEFINER, `search_path=''`): `api_report_nonconformity`, `api_record_measurement`, `api_create_pqrs`, `api_create_nc_output`. Toman `p_org` + `p_actor` (el **creador de la key**, para trazabilidad) + payload; validan enums y que el proceso/indicador/caso pertenezcan a `p_org`; **no** usan `auth.uid()` (la autorización es la key, ya verificada en el endpoint). Devuelven el código creado. Reusan los contadores y `log_event` existentes.
- **Idempotencia:** cabecera `Idempotency-Key`. Tabla `api_idempotency(organization_id, idem_key, response jsonb, created_at)` con `unique(organization_id, idem_key)`: si ya existe, se devuelve la misma respuesta sin volver a crear.

### Webhooks (ADR-082/083)
- **`webhook_endpoints`**: id, organization_id, url, secret (para firmar; se muestra una vez), events text[] (subconjunto de los 4), active, created_by, created_at, revoked_at. RLS select para quien administra; RPC crear/revocar.
- **`webhook_deliveries`**: id, organization_id, endpoint_id, event, payload jsonb, status ('pendiente'|'enviado'|'fallido'), attempts int, last_error, next_attempt_at, created_at.
- **Encolado por disparadores (ADR-082):** `AFTER INSERT` en `nonconformities`, `indicator_measurements`, `pqrs_cases`, `nonconforming_outputs` → `enqueue_webhook(org, event, payload)` inserta una entrega **por cada endpoint activo suscrito**. Cubre **todas** las rutas (app, API y NC generadas) uniformemente. El `payload` son **campos mínimos sin PII** (como la API de lectura).
- **Entrega (ADR-083):** una función Node `deliverWebhooks()` toma entregas `pendiente`/vencidas, hace `POST` con cabeceras `X-Crubol-Event` y **`X-Crubol-Signature: sha256=<HMAC-SHA256(payload, secret)>`**; 2xx → `enviado`; si no, `attempts++`, backoff exponencial en `next_attempt_at`, tras N intentos → `fallido`. Se invoca: **inmediatamente** vía `after()` en las rutas de escritura y en las acciones que crean estos eventos; y en el **cron diario** para reintentos/rezagados.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| 4 endpoints POST (NC, medición, PQRS, salida) con scopes de escritura | **Sí** | Decisión de Fernando |
| Idempotency-Key | **Sí** | Decisión de Fernando |
| Webhooks de los 4 eventos de creación, firmados HMAC | **Sí** | Decisión de Fernando |
| Entrega con cola + intento inmediato + reintentos (backoff) | **Sí** | Decisión de Fernando |
| Gestión de endpoints en Administración (secreto una vez, revocar) | **Sí** | Emisión/control |
| Reintento/entrega de prueba desde la UI | No | Diferido (el cron reintenta) |
| Escritura amplia / edición por API / eventos de cambio de estado | No | Diferido |

**Camino dorado:** el admin crea una key con `write:nonconformities` y un **endpoint de webhook** suscrito a `nonconformity.created` (copia el secreto) → un sistema externo hace `POST /api/v1/nonconformities` → se crea la NC → el webhook llega firmado al sistema del cliente en segundos.

## 4. Mapa de rutas
- `POST /api/v1/nonconformities · /indicator-measurements · /pqrs · /nonconforming-outputs` (Bearer + write scope + Idempotency-Key).
- `GET /api/cron/webhooks` (Bearer CRON_SECRET) — reintentos (además del diario).
- **Administración → pestaña "API"**: además de las keys, una sección **Webhooks** (crear/listar/revocar endpoints; secreto mostrado una vez).
- `docs/api/USO.md`: se amplía con escritura, idempotencia y webhooks (eventos, firma, verificación).

## 5. Integraciones y riesgos
**Dependencias nuevas:** **ninguna** (HMAC con `crypto`; `after()`, service client y Upstash ya presentes).

**Top 3 riesgos y mitigación:**
1. **Escritura cruzada entre organizaciones** → las funciones `api_*` fijan `organization_id` al `org` de la key y validan que proceso/indicador/caso referenciados pertenezcan a ese org; nunca se acepta un org del cuerpo.
2. **Webhook a destino malicioso / SSRF / falsificación** → el `url` es del cliente (su propio sistema); el `POST` va **firmado (HMAC)** para que el receptor verifique autenticidad; sin reintentos infinitos (tope + backoff); el secreto se guarda y se muestra una vez.
3. **Duplicados por reintento del cliente** → `Idempotency-Key` único por organización evita crear dos veces; el webhook lleva un `id` de evento para deduplicar en el receptor.

## ADRs

### ADR-081 — Escritura por funciones `api_*` dedicadas + Idempotency-Key
**Contexto:** las RPC de la app autorizan por `auth.uid()`/membresía; la API no tiene sesión.
**Decisión:** funciones `api_*` (definer) que reciben `p_org` + `p_actor` (creador de la key) y payload, validan y escriben reusando contadores/log; la autorización es la API key (scope de escritura) verificada en el endpoint; `Idempotency-Key` con tabla de deduplicación.
**Consecuencias:** escritura segura sin sesión; trazabilidad por el actor de la key; sin duplicados en reintentos.

### ADR-082 — Webhooks encolados por disparadores AFTER INSERT
**Contexto:** el evento debe dispararse sin importar si el registro nace en la app, la API o una generación interna.
**Decisión:** triggers `AFTER INSERT` en las 4 tablas → `enqueue_webhook(org, event, payload-mínimo)` por endpoint activo suscrito.
**Consecuencias:** cobertura uniforme; payload sin PII; una entrega por endpoint.

### ADR-083 — Entrega firmada HMAC, inmediata + reintentos con backoff
**Contexto:** entrega confiable y casi en tiempo real sin depender de un cron de alta frecuencia.
**Decisión:** `deliverWebhooks()` firma con HMAC-SHA256; intento **inmediato** vía `after()` en las rutas de escritura y acciones de creación; **reintentos con backoff** en el cron diario (+ `GET /api/cron/webhooks`).
**Consecuencias:** baja latencia para eventos originados en código propio; entrega garantizada con reintentos; sin dependencia de crons sub-diarios.

### ADR-084 — Endpoints de webhook gestionados en Administración
**Contexto:** solo quien administra debe registrar/revocar destinos y conocer el secreto.
**Decisión:** crear/listar/revocar en la pestaña "API" (Admin de organización o Líder SIG); secreto mostrado una sola vez; `revoked_at` (baja lógica).
**Consecuencias:** control claro y auditable; sin exponer el secreto después de crearlo.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (sección Webhooks en Administración + formato de eventos). Luego backend, seguridad y deploy. Después, #2 Gestión del conocimiento.
