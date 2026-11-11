# API pública de CrubolDocs (solo lectura)

API REST de **solo lectura** por organización. Útil para integrar tus datos del SGC con BI, tableros
o sistemas propios.

## Autenticación
Cada petición lleva una **clave de API** como *Bearer token*:

```
Authorization: Bearer ck_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

- La clave la crea un **administrador** de la organización en **Administración → API**. El token se
  muestra **una sola vez**; guárdalo. Después solo verás su prefijo.
- Cada clave tiene **permisos** (scopes) de solo lectura; solo puede leer los recursos que le
  concediste. Puedes **revocarla** en cualquier momento.
- **Límite:** 120 peticiones por minuto por clave. Al exceder: `429`.

## Base
```
https://cruboldocs.crubol.com/api/v1
```

## Paginación
Todos los recursos aceptan `?limit=` (1–100, por defecto 50) y `?offset=`. La respuesta trae
`nextOffset` (número para la siguiente página, o `null` si no hay más).

```json
{ "data": [ … ], "nextOffset": 50 }
```

## Recursos y permisos

| Endpoint | Permiso | Campos |
|---|---|---|
| `GET /nonconformities` | `read:nonconformities` | code, status, severity, source, title, detectedAt, process |
| `GET /indicators` | `read:indicators` | code, name, unit, target, status, process, lastValue, lastPeriod, lastCompliance |
| `GET /risks` | `read:risks` | code, description, category, status, process, level, score |
| `GET /audits` | `read:audits` | code, title, status, plannedDate, closedDate |
| `GET /pqrs` | `read:pqrs` | code, type, channel, status, process, receivedDate, dueDate |

> La API **no** devuelve datos personales: PQRS no incluye el nombre ni el contacto del cliente.

## Errores
JSON `{ "error": "…" }` con código HTTP: `401` (sin clave o inválida/revocada), `403` (sin permiso
para el recurso), `429` (límite), `400`/`500` (petición o servidor).

## Ejemplo
```bash
curl -s -H "Authorization: Bearer $CRUBOL_API_KEY" \
  "https://cruboldocs.crubol.com/api/v1/indicators?limit=20"
```

## Escritura (v1.4)

Operaciones `POST` con `Content-Type: application/json`. Opcional `Idempotency-Key: <único>` para no
duplicar en reintentos. Cada una exige su permiso de **escritura** en la clave.

| Endpoint | Permiso | Cuerpo (mínimo) | Respuesta |
|---|---|---|---|
| `POST /nonconformities` | `write:nonconformities` | `{ source, title, description, severity, processCode?, detectedAt? }` | `201 {code}` |
| `POST /indicator-measurements` | `write:indicators` | `{ indicatorCode, period, value \| (numerator,denominator), note? }` | `201 {indicatorCode, compliance}` |
| `POST /pqrs` | `write:pqrs` | `{ type, channel, description, customerName?, customerContact?, processCode?, receivedDate?, dueDays? }` | `201 {code}` |
| `POST /nonconforming-outputs` | `write:nonconforming_outputs` | `{ description, processCode?, detectedDate?, identification? }` | `201 {code}` |

Errores de escritura: `400` (datos), `401`/`403` (auth/scope), `422` (regla de negocio), `429` (límite).

Ejemplo:
```bash
curl -s -X POST -H "Authorization: Bearer $CRUBOL_API_KEY" \
  -H "Content-Type: application/json" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"source":"otro","title":"Desvío en proceso X","description":"...","severity":"menor"}' \
  https://cruboldocs.crubol.com/api/v1/nonconformities
```

## Webhooks (v1.4)

Registra un endpoint en **Administración → API → Webhooks** y suscríbelo a eventos. CrubolDocs hará
un `POST` a tu URL cuando ocurran:

- `nonconformity.created`, `indicator.measurement.recorded`, `pqrs.created`, `nonconforming_output.created`.

**Cuerpo del evento:**
```json
{ "id": "<uuid>", "event": "nonconformity.created", "occurredAt": "<iso>",
  "organization": "<uuid>", "data": { ... campos mínimos sin datos personales ... } }
```

**Cabeceras:** `X-Crubol-Event`, `X-Crubol-Delivery` (id de entrega), `X-Crubol-Signature: sha256=<hex>`.

**Verifica la firma** (así confirmas que viene de CrubolDocs). Ejemplo Node:
```js
import { createHmac, timingSafeEqual } from "crypto"
const sig = req.headers["x-crubol-signature"].split("=")[1]
const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex")
const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
```

Entregas con reintentos (backoff); deduplica por el `id` del evento. El secreto se muestra una sola
vez al crear el endpoint.
