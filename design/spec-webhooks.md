# Design Spec — Webhooks en Administración + API de escritura

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/api-write/ARQUITECTURA.md + ADR-081..084.

## 1. Propósito y protagonista
- **Qué logra:** registrar **endpoints de webhook** (a qué URL y para qué eventos) y ver su estado; la escritura por API no tiene UI (es para integradores).
- **Protagonista:** la **lista de endpoints** (y el secreto mostrado una vez al crear).
- **Roles:** Admin de organización o Líder SIG (misma gate que las API keys).

## 2. Ubicación
En la **pestaña "API"** de `/app/admin`, debajo de las claves: una sección **"Webhooks"**. La sección de claves ahora incluye también los **permisos de escritura** al crear.

## 3. Sección "Webhooks"
```
Webhooks                                              [ + Nuevo endpoint ]
Recibe un POST firmado cuando ocurren eventos. Guarda el secreto al crearlo.

┌──────────────────────────────────────────────────────────────────────┐
│ https://cliente.com/hooks/crubol    nonconformity.created, pqrs.created│
│ creado 2026-11-10 · 3 entregas, 0 fallidas                 [ Revocar ] │
└──────────────────────────────────────────────────────────────────────┘
```
- **Lista:** por endpoint: **URL** (`mono`, truncada), **eventos** (chips), fechas, un resumen "N entregas · M fallidas", estado. Activos con **"Revocar"**; revocados atenuados.
- **Sheet "Nuevo endpoint":** **URL** (req, `https://`), **Eventos** (checkbox: NC creada, Medición registrada, PQRS creada, Salida no conforme creada). Footer "Crear".
- **Al crear — secreto una sola vez:** bloque destacado con el **secreto de firma** (`mono`, seleccionable) + **Copiar** + aviso "Guárdalo: firma cada webhook y no se vuelve a mostrar."
- **Revocar:** confirma; el endpoint deja de recibir.

## 4. Claves de API — permisos de escritura
El Sheet "Nueva clave" lista ahora los permisos agrupados: **Lectura** (los 5 actuales) y **Escritura** (No conformidades, Mediciones, PQRS, Salidas no conformes). Un chip visual distingue escritura de lectura.

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Vacío | `EmptyState` (ícono rayo/webhook): "Sin webhooks" + "Crear el primero". |
| Secreto recién creado | Bloque con el secreto + copiar; no se reabre. |
| Revocado | Fila atenuada, sin "Revocar". |
| Error / Éxito | toast + `router.refresh()`. |

## 6. Formato (referencia para `docs/api/USO.md`)
### Escritura
`POST /api/v1/<recurso>` con `Authorization: Bearer`, `Content-Type: application/json`, opcional `Idempotency-Key`.
- `nonconformities` (`write:nonconformities`): `{ source, processCode?, title, description, severity, detectedAt? }` → `201 {code}`.
- `indicator-measurements` (`write:indicators`): `{ indicatorCode, period, value, numerator?, denominator?, note? }` → `201 {...}`.
- `pqrs` (`write:pqrs`): `{ type, channel, customerName?, customerContact?, processCode?, description, receivedDate?, dueDays? }` → `201 {code}`.
- `nonconforming-outputs` (`write:nonconforming_outputs`): `{ description, processCode?, detectedDate?, identification? }` → `201 {code}`.
- Errores: `400` (datos), `401`/`403` (auth/scope), `409` (idempotencia con cuerpo distinto), `422` (regla de negocio), `429`.

### Evento de webhook (cuerpo del POST saliente)
```json
{ "id": "<uuid>", "event": "nonconformity.created", "occurredAt": "2026-11-11T15:00:00Z",
  "organization": "<uuid>", "data": { "code": "NC-2026-010", "status": "...", "severity": "...", "process": "..." } }
```
Cabeceras: `X-Crubol-Event`, `X-Crubol-Delivery` (id de entrega), `X-Crubol-Signature: sha256=<hex>`.
**Verificación:** `HMAC_SHA256(secreto, cuerpo_crudo)` debe igualar la firma. Reintentos con backoff; dedupe por `id`.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Input, Checkbox, EmptyState | Reutilizados | |
| **WebhooksPanel** + **NewWebhookSheet** + **SecretReveal** | Nuevo | lista + crear + secreto una vez |
| Ampliación de **NewApiKeySheet** | Extensión | agrupar lectura/escritura |

## 8. Decisiones
- **Secreto una sola vez** (ADR-084): refuerza el modelo; sin él no se puede verificar la firma, así que debe guardarse al crear.
- **Firma HMAC** (ADR-083): el receptor confía en que el POST viene de CrubolDocs.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
