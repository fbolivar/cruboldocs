# Arquitectura — Portal externo (PQRS pública + autoevaluación de proveedor)

**Producto:** CrubolDocs · **Feature:** v1.4-3 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Turnstile · Upstash · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** clientes y proveedores interactúan con el SGC **sin cuenta**. Hoy solo existe la encuesta pública; falta radicar PQRS y que un proveedor se autoevalúe. SoftExpert vende "portal de proveedores".
- **Acción de valor:** (a) **PQRS pública** — un cliente radica una petición/queja/reclamo desde un enlace por organización; (b) **autoevaluación de proveedor** — el Líder SIG envía un enlace por proveedor y este responde su autoevaluación para revisión del SIG.
- **Decisiones (Fernando):** ambos flujos; PQRS = enlace por organización con **token, opt-in del Admin**; proveedor = **token por proveedor**, respuesta para revisión (no auto-aprueba); **Turnstile + rate-limit** en los endpoints públicos.
- **Dato personal:** el cliente puede dejar nombre/contacto (minimizado, igual que PQRS). Nota en `/tratamiento-de-datos`.

## 2. Modelo / técnica
Reusa el **patrón de la encuesta pública** (ADR-038..040): RPC `SECURITY DEFINER` ejecutable por `anon` validado por token; Turnstile + rate-limit (Upstash) en la server action **antes** del RPC.

### PQRS pública (ADR-088/089)
- **`public_pqrs_portals`**: organization_id PK, token unique, enabled bool, created_by (el Admin que lo habilitó), created_at. RLS select por `can_manage_pqrs`.
- **RPC gestión:** `set_public_pqrs_portal(p_org, p_enabled)` (upsert; genera/rota token; `can_manage_pqrs`) → devuelve el token.
- **RPC públicas (anon):** `get_public_pqrs_portal(token)` → `{organization, enabled}`; `submit_public_pqrs(token, type, customer_name, customer_contact, description)` → crea la PQRS con `channel='web'`, `created_by = portal.created_by` (NOT NULL), reusando el contador/numeración PQRS.
- **Ruta pública:** `/pqrs/[token]` (formulario). Server action: Turnstile `pqrs_publica` + rate-limit (`pqrs_pub:ip`, `pqrs_pub:token_ip`) → RPC.

### Autoevaluación de proveedor (ADR-090)
- **`suppliers.self_assessment_token`** (text unique, nullable) — enlace vigente por proveedor.
- **`supplier_self_assessments`**: id, org, supplier_id, score numeric(5,2) 0–100, comment, status ('recibida'|'revisada'), ip_hash, submitted_at. RLS select por `can_see_suppliers`.
- **RPC gestión:** `issue_supplier_self_assessment(p_supplier)` (genera/rota token; `can_manage_suppliers`) → token; `mark_self_assessment_reviewed(p_assessment)`.
- **RPC públicas (anon):** `get_supplier_self_assessment(token)` → `{supplier, organization}`; `submit_supplier_self_assessment(token, score, comment, ip_hash)` → inserta `recibida` (no toca la evaluación oficial).
- **Ruta pública:** `/proveedor/[token]`. Server action: Turnstile `proveedor` + rate-limit.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| PQRS pública: buzón por organización (opt-in, token, regenerar/desactivar) | **Sí** | Decisión de Fernando |
| Formulario público `/pqrs/[token]` → crea PQRS (canal web) | **Sí** | Núcleo |
| Autoevaluación de proveedor: token por proveedor | **Sí** | Decisión de Fernando |
| Formulario público `/proveedor/[token]` → autoevaluación para revisión | **Sí** | Decisión de Fernando |
| Ver respuestas en la ficha de proveedor + marcar revisada | **Sí** | Cierra el ciclo |
| Turnstile + rate-limit en ambos | **Sí** | Decisión de Fernando |
| Adjuntos del cliente / seguimiento público del caso | No | Diferido |
| Portal con login de proveedor / múltiples formularios | No | Diferido |

**Camino dorado:** el Admin activa el **buzón público de PQRS** y comparte el enlace → un cliente radica un reclamo → aparece como PQRS (canal web) en el módulo. · El Líder SIG genera el **enlace de autoevaluación** de un proveedor → el proveedor responde → el SIG lo revisa en la ficha.

## 4. Mapa de rutas
- **`/pqrs/[token]`** (pública): formulario de PQRS. · **`/proveedor/[token]`** (pública): autoevaluación.
- **`/app/pqrs`**: botón **"Buzón público"** (activar/desactivar, copiar enlace) — `can_manage_pqrs`.
- **`/app/proveedores/[codigo]`**: botón **"Enviar autoevaluación"** (genera/copia enlace) + sección de **autoevaluaciones recibidas** (marcar revisada).
- `robots.ts`: las rutas públicas quedan fuera del índice salvo que se decida lo contrario (son formularios tokenizados).

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (Turnstile/Upstash/`crypto` ya presentes).

**Top 3 riesgos y mitigación:**
1. **Spam/bots en formularios públicos** → Turnstile + rate-limit por IP y por (token, IP); token opaco; el buzón se puede desactivar/rotar.
2. **Cruce de organización** → cada RPC pública resuelve el `org` **por el token**; inserta con ese `org`; nunca acepta un org del cuerpo.
3. **Dato personal del cliente** → minimizado (nombre/contacto opcionales); nota de privacidad; sin adjuntos en v1.

## ADRs

### ADR-088 — Portal público reusa el patrón de la encuesta
**Contexto:** ya hay un patrón probado (RPC anon por token + Turnstile + rate-limit) para la encuesta.
**Decisión:** PQRS pública y autoevaluación de proveedor siguen el mismo patrón; RPC `get_*`/`submit_*` ejecutables por `anon`, validadas por token; CAPTCHA y rate-limit en la server action.
**Consecuencias:** superficie pública consistente y acotada; `anon` crece de 2 a los RPC públicos nuevos (esperado y documentado).

### ADR-089 — PQRS pública por buzón de organización (opt-in)
**Contexto:** el buzón debe poder activarse/desactivarse y no exponer datos.
**Decisión:** tabla `public_pqrs_portals` con token y `enabled`; `set_public_pqrs_portal` rota/activa; la PQRS se crea con `created_by = creador del buzón` (NOT NULL) y `channel='web'`.
**Consecuencias:** control del canal; trazabilidad al responsable del buzón; sin cuentas para el cliente.

### ADR-090 — Autoevaluación de proveedor para revisión (no auto-aprueba)
**Contexto:** la evaluación oficial del proveedor la hace el SIG; la autoevaluación es insumo.
**Decisión:** `supplier_self_assessments` con estado `recibida`/`revisada`; no modifica la evaluación oficial; el SIG la revisa en la ficha.
**Consecuencias:** se capta la voz del proveedor sin ceder el control de la calificación.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (formularios públicos + controles en PQRS/Proveedores). Luego backend, seguridad, deploy. Después #4 Multi-idioma.
