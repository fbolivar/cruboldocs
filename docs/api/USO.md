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
