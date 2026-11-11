# Arquitectura — API pública (solo lectura)

**Producto:** CrubolDocs · **Feature:** v1.3-5b-ii (API) · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (Route Handlers) + TypeScript · Supabase (service role, server-only) · Upstash · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** los clientes quieren **integrar** los datos de su SGC (BI, ERP, tableros propios) sin entrar a la app. Es un diferenciador enterprise.
- **Acción de valor:** una **API REST de solo lectura** por organización, autenticada con **API key** (Bearer), que devuelve No conformidades, Indicadores, Riesgos, Auditorías y PQRS de **esa** organización.
- **Decisiones (Fernando, 2026-11-11):** **solo lectura (GET)**; **API keys por organización** (hasheadas, creadas en Administración); recursos = NC, Indicadores (con última medición), Riesgos, Auditorías y PQRS; **rate-limit por key (Upstash) + scopes de solo-lectura por recurso**.
- **Dato personal:** la API **omite** datos personales (p. ej. PQRS **sin** nombre/contacto del cliente); solo metadatos (código, tipo, estado, proceso, fechas).

## 2. Modelo / técnica
Una tabla nueva + endpoints; la autenticación NO usa sesión de usuario (es servidor-a-servidor).

### `api_keys` (nueva) — ADR-078
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | la API key pertenece a una organización |
| name | text NOT NULL | etiqueta ("Integración BI") |
| key_prefix | text NOT NULL | primeros caracteres visibles (p. ej. `ck_live_ab12…`) para identificarla |
| key_hash | text NOT NULL UNIQUE | **SHA-256** del token; el token en claro **nunca** se guarda |
| scopes | text[] NOT NULL | subconjunto de `read:nonconformities`, `read:indicators`, `read:risks`, `read:audits`, `read:pqrs` |
| created_by | uuid default auth.uid() | |
| created_at / last_used_at | timestamptz | `last_used_at` se actualiza en cada uso |
| revoked_at | timestamptz NULL | null = activa; baja lógica |

RLS: `select` para quien administra (Admin de organización o Líder SIG). Escritura por RPC (`create_api_key`/`revoke_api_key`). Índice por `key_hash`.

### Generación y verificación de la key
- **Crear** (server action): se genera el token con `crypto.randomBytes` → `ck_live_<base64url>`; se calcula el **hash SHA-256**; el RPC `create_api_key(org, name, scopes, prefix, hash)` autoriza (Admin/Líder SIG) e inserta. El **token en claro se muestra UNA sola vez** en la UI; después solo queda el prefijo.
- **Verificar** (en cada petición): el endpoint lee `Authorization: Bearer <token>`, calcula su SHA-256 y busca en `api_keys` con el **cliente de servicio** (no hay sesión); si existe, no está revocada y el scope cubre el recurso, resuelve `organization_id` y sirve. `last_used_at = now()`.

### Endpoints (Route Handlers, Node runtime) — ADR-079
`GET /api/v1/nonconformities · /indicators · /risks · /audits · /pqrs`
- **Auth:** Bearer + scope del recurso; sin key válida → 401; sin scope → 403.
- **Scope de datos:** toda consulta filtra por el `organization_id` de la key (el cliente de servicio **no** aplica RLS, así que el filtrado por organización es **obligatorio y explícito** en cada query — es el control crítico).
- **Rate-limit:** `withinLimits([["api:key", <hash>]])` (regla nueva en `rate-limit.ts`, p. ej. 120/min); exceder → 429.
- **Forma:** JSON `{ data: [...], nextOffset }` con **paginación** `?limit` (≤100, def. 50) `&offset`; campos mínimos, **sin dato personal**.
- **Errores:** JSON `{ error }` con 400/401/403/429/500; nunca filtra detalles internos.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| API keys por organización (crear/listar/revocar en Admin) | **Sí** | Autenticación |
| 5 endpoints GET (NC, Indicadores, Riesgos, Auditorías, PQRS) | **Sí** | Decisión de Fernando |
| Scopes de solo-lectura por recurso | **Sí** | Decisión de Fernando |
| Rate-limit por key (Upstash) | **Sí** | Decisión de Fernando |
| Paginación + campos mínimos (sin PII) | **Sí** | Seguridad/privacidad |
| Doc de uso (`docs/api/USO.md`) | **Sí** | Para los integradores |
| Escritura por API (POST/PATCH) | No | Diferida (decisión de Fernando) |
| Webhooks / OpenAPI formal / versionado v2 | No | Diferido |

**Camino dorado:** en Administración, el Líder SIG crea una key con scope `read:indicators` → copia el token (se muestra una vez) → `curl -H "Authorization: Bearer <token>" https://cruboldocs.crubol.com/api/v1/indicators` → recibe sus indicadores en JSON.

## 4. Mapa de rutas
- **`/api/v1/*`** (público, Bearer): 5 recursos GET. Sin sesión; auth por key.
- **Administración → pestaña "API"**: crear/listar/revocar keys (Admin de organización o Líder SIG). El token se muestra una sola vez.
- `docs/api/USO.md`: cómo autenticar, endpoints, paginación, límites.

## 5. Integraciones y riesgos
**Dependencias nuevas:** **ninguna** (usa `@upstash/ratelimit` ya presente; `crypto`/service client ya presentes).

**Top 3 riesgos y mitigación:**
1. **Fuga entre organizaciones** (el cliente de servicio no tiene RLS) → **cada query filtra explícitamente por `organization_id` de la key**; las lecturas de la API son funciones dedicadas que reciben el `org` y nunca aceptan uno del request; revisión específica en la auditoría.
2. **Token robado / abuso** → token solo-hash (nunca se guarda ni se loguea el claro), revocación por `revoked_at`, rate-limit por key, scopes mínimos; `last_used_at` para detectar uso anómalo.
3. **Fuga de dato personal** → la API devuelve **metadatos sin PII** (PQRS sin nombre/contacto del cliente); documentado.

## ADRs

### ADR-078 — API keys por organización, hasheadas (token mostrado una vez)
**Contexto:** la integración es servidor-a-servidor; no hay sesión de usuario ni RLS aplicable.
**Decisión:** tabla `api_keys` con `key_hash` (SHA-256) + `key_prefix` + `scopes`; el token en claro se muestra una sola vez y nunca se almacena; verificación por hash con el cliente de servicio.
**Consecuencias:** robo del token mitigado (solo-hash + revocación); la verificación debe filtrar por `organization_id` en cada query (control crítico).

### ADR-079 — Solo lectura, scopes por recurso, rate-limit por key, sin PII
**Contexto:** exponer datos del SGC con la mínima superficie y sin filtrar datos personales.
**Decisión:** 5 endpoints GET; cada key con sus `scopes`; `withinLimits(["api:key", hash])`; respuestas con campos mínimos (PQRS sin contacto del cliente); paginación.
**Consecuencias:** superficie acotada; la escritura y los webhooks se difieren; el integrador pagina.

### ADR-080 — Gestión de keys en Administración; revocación lógica
**Contexto:** solo quien administra la organización debe emitir/revocar keys.
**Decisión:** crear/listar/revocar en la pestaña "API" de Administración (Admin de organización o Líder SIG); RPCs `create_api_key`/`revoke_api_key`; `revoked_at` (baja lógica).
**Consecuencias:** control claro y auditable; sin borrado físico (histórico conservado).

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (pestaña "API" en Administración + formato de respuestas). Luego backend (tabla + endpoints), seguridad y deploy. **Con esto se cierra todo el backlog de v1.3.**
