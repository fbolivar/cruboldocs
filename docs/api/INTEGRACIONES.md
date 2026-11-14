# Integraciones — Zapier / Make (y otras no-code)

CrubolDocs se integra con Zapier, Make y cualquier plataforma no-code **sobre la API existente**. No hay que programar nada por cliente: se conecta con una **API key** y se usan los **webhooks** (triggers) y los **endpoints POST** (acciones) ya disponibles.

> La *app* de Zapier/Make se define en sus propias plataformas apuntando a esta API. Este documento es la referencia para armarla o para usar sus bloques genéricos de "Webhooks" y "HTTP".

## 1. Conexión (autenticación)

- Crea una **API key** en **Administración → API** (elige los scopes que necesites).
- Autentícate con el encabezado `Authorization: Bearer <API_KEY>`.
- **Test de conexión:** `GET /api/v1/me` → responde `{ organization: { id, name }, scopes, key_name }`. Úsalo como paso de "Test" de la conexión en Zapier/Make.

```
curl -H "Authorization: Bearer ck_live_..." https://cruboldocs.crubol.com/api/v1/me
```

## 2. Triggers (eventos salientes = webhooks)

Registra un **endpoint de webhook** en **Administración → API** (copia el secreto una sola vez) y suscríbelo a los eventos. Cada entrega llega firmada:

- `X-Crubol-Event: <evento>`
- `X-Crubol-Signature: sha256=<HMAC-SHA256(cuerpo, secreto)>`

Eventos disponibles (creación):

| Evento | Cuándo |
|---|---|
| `nonconformity.created` | Se crea una no conformidad |
| `indicator_measurement.created` | Se registra una medición de indicador |
| `pqrs.created` | Se crea una PQRS |
| `nonconforming_output.created` | Se registra una salida no conforme |

El cuerpo trae campos mínimos sin datos personales (incluye un `id` de evento para deduplicar).

**Verificación de firma (ejemplo Node):**

```js
import crypto from "node:crypto"
const esperado = "sha256=" + crypto.createHmac("sha256", SECRETO).update(cuerpoCrudo).digest("hex")
const valido = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(headers["x-crubol-signature"]))
```

## 3. Acciones (crear registros = POST)

Requieren el scope de escritura correspondiente y aceptan `Idempotency-Key` (evita duplicados en reintentos).

| Acción | Endpoint | Scope |
|---|---|---|
| Crear no conformidad | `POST /api/v1/nonconformities` | `write:nonconformities` |
| Registrar medición | `POST /api/v1/indicator-measurements` | `write:indicators` |
| Crear PQRS | `POST /api/v1/pqrs` | `write:pqrs` |
| Crear salida no conforme | `POST /api/v1/nonconforming-outputs` | `write:nonconforming_outputs` |

## 4. Recetas de ejemplo

- **"Nueva fila en Google Sheets → crear PQRS":** trigger de Sheets (Zapier) → acción HTTP `POST /api/v1/pqrs` con `Authorization: Bearer` y el cuerpo de la PQRS.
- **"No conformidad creada → mensaje en Slack":** trigger "Webhooks by Zapier" (Catch Hook) suscrito a `nonconformity.created` → acción de Slack con los campos del evento.
- **"Correo entrante (Make) → crear no conformidad":** módulo de correo → módulo HTTP `POST /api/v1/nonconformities`.

## 5. Importación masiva (CSV)

Para cargar datos históricos sin API, usa **Administración → Importar** (procesos, cargos, proveedores, requisitos legales): descarga la plantilla, completa el CSV, previsualiza y confirma.

## Límites y seguridad

- Rate-limit por clave; revoca una key o un webhook desde **Administración → API**.
- Los webhooks van a la URL que tú registras (tu propio sistema) y van firmados para que verifiques autenticidad.
- La API nunca acepta un `organization_id` del cuerpo: siempre es el de la clave.
