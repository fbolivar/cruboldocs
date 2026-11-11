# Arquitectura — SCAR: Solicitud de acción correctiva a proveedor (v1.5-3)

**Producto:** CrubolDocs · **Feature:** v1.5-3 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Turnstile · Upstash · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** cuando un proveedor causa un problema (una NC de origen proveedor, una entrega defectuosa), el SIG necesita **pedirle acción correctiva** y seguir su respuesta. Hoy el portal solo capta autoevaluación. El mercado lo llama **SCAR**.
- **Acción de valor:** el SIG **emite un SCAR** a un proveedor (desde su ficha o desde una NC), el proveedor **responde por un enlace sin cuenta** (causa raíz + acciones + fecha compromiso), y el SIG **revisa y acepta o rechaza** (el rechazo reabre para que el proveedor corrija).
- **Decisiones (Fernando):** (1) emitir **desde la ficha de proveedor y desde una NC** (vínculo opcional a la NC); (2) el proveedor responde por **portal público por token**; (3) cierre: **enviada → respondida → aceptada | rechazada→reabre**.
- **Dato personal:** el SCAR no lleva datos de clientes; el problema se describe sin PII (igual que el payload de webhooks).

## 2. Modelo / técnica
Reusa el **patrón del portal** (ADR-088..090): RPC `anon` por token + Turnstile + rate-limit en la server action antes del RPC.

- **`scars`**: `(id, organization_id, code 'SCAR-AAAA-###', supplier_id→suppliers(id,org), nonconformity_id→nonconformities(id,org) null, title, description, status in ('enviada','respondida','aceptada','rechazada','anulada') default 'enviada', due_date, token text unique, supplier_root_cause text null, supplier_actions text null, supplier_commit_date date null, responded_at, review_notes text null, reviewed_by, reviewed_at, reopened_count int default 0, created_by, created_at, updated_at; unique(org, code); unique(id, org); FKs compuestas a suppliers y nonconformities)`. Contador `scar_counters` deny-all. RLS select por `can_see_suppliers`.
- **RPC gestión (definer, autz `can_manage_suppliers(org, supplier.process)`):**
  - `create_scar(p_org, p_supplier, p_nc, p_title, p_description, p_due_days, p_token)` → code `SCAR-AAAA-###`; status `enviada`; `due_date = hoy + p_due_days`; token generado por la action.
  - `review_scar(p_scar, p_accept, p_notes)` → si acepta: `aceptada` (cierre); si rechaza: `reopened_count+1`, `status='enviada'` (reabre; el proveedor puede corregir con el mismo enlace) y guarda `review_notes`.
  - `cancel_scar(p_scar, p_reason)` → `anulada` (solo desde abiertos).
- **RPC públicas (anon):** `get_scar_public(token)` → `{organization, supplier, title, description, dueDate}` solo si `status='enviada'`; `submit_scar_response(token, root_cause, actions, commit_date, ip_hash)` → exige `status='enviada'`; guarda la respuesta, `status='respondida'`, `responded_at`.
- **Ruta pública:** `/scar/[token]`. Server action: Turnstile `scar` + rate-limit (`scar:ip`, `scar:token_ip`) → RPC.
- **Emisión desde NC:** en la ficha de NC, botón "Emitir SCAR" que elige el proveedor y precarga título/descr. desde la NC, ligando `nonconformity_id` (trazabilidad NC↔SCAR).

## 3. Alcance del MVP
| Feature | ¿v1.5-3? | Justificación |
|---|---|---|
| Emitir SCAR desde la ficha de proveedor | **Sí** | Núcleo |
| Emitir SCAR desde una NC (vínculo a la NC) | **Sí** | Decisión de Fernando |
| Respuesta del proveedor por portal público `/scar/[token]` | **Sí** | Decisión de Fernando |
| Revisión del SIG: aceptar (cierra) / rechazar (reabre) | **Sí** | Decisión de Fernando |
| Lista de SCARs y su estado en la ficha de proveedor | **Sí** | Cierra el ciclo |
| Turnstile + rate-limit en el portal | **Sí** | Seguridad |
| Adjuntos del proveedor / seguimiento público del caso | No | Diferido (texto en v1) |
| Dashboard/ruta propia de SCARs | No | Vive en la ficha de proveedor |
| Recordatorio de vencimiento por cron | No | Diferido (se puede sumar luego como tarea) |

**Camino dorado:** el SIG abre la ficha de un proveedor, **emite un SCAR** (título + descripción + plazo), comparte el enlace → el proveedor responde (causa raíz + acciones + fecha) → el SIG lo revisa: si está bien, **acepta** (cerrada); si no, **rechaza** y el proveedor corrige con el mismo enlace. · Desde una NC de origen proveedor, el mismo flujo con el vínculo a la NC.

## 4. Mapa de rutas
- **`/scar/[token]`** (pública): formulario de respuesta del proveedor.
- **`/app/proveedores/[codigo]`**: sección **SCAR** — emitir, copiar enlace, ver respuesta, aceptar/rechazar, lista con estado.
- **`/app/no-conformidades/[codigo]`**: botón **"Emitir SCAR"** (elige proveedor, precarga desde la NC).
- `robots.ts`: `/scar/[token]` fuera del índice (formulario tokenizado).

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (Turnstile/Upstash/contador/portal ya presentes).

**Top 3 riesgos y mitigación:**
1. **Spam/bots en el portal público** → Turnstile + rate-limit por IP y (token, IP); token opaco; el SCAR se puede anular.
2. **Cruce de organización** → cada RPC pública resuelve el `org`/proveedor **por el token**; las RPC de gestión por FK compuesta + `can_manage_suppliers`.
3. **Dato del cliente en el texto** → el problema se describe sin PII; sin adjuntos en v1; nota al emitir.

## ADRs

### ADR-109 — SCAR por portal público tokenizado (reusa el patrón del portal)
**Contexto:** ya hay un patrón probado (RPC anon por token + Turnstile + rate-limit).
**Decisión:** el proveedor responde por `/scar/[token]` sin cuenta; `get_scar_public`/`submit_scar_response` ejecutables por `anon`, validadas por token.
**Consecuencias:** superficie pública consistente y acotada; `anon` crece con 2 RPC nuevas (documentado).

### ADR-110 — SCAR como entidad propia con ciclo de rechazo/reapertura
**Contexto:** el SCAR tiene vida propia y puede ligarse a una NC.
**Decisión:** tabla `scars` con estados enviada/respondida/aceptada/rechazada/anulada; rechazar reabre (`status='enviada'`, `reopened_count+1`); `nonconformity_id` opcional.
**Consecuencias:** refleja el ciclo real; trazabilidad NC↔SCAR; sin acoplar al flujo CAPA.

### ADR-111 — Gestión en la ficha de proveedor (sin ruta propia), sin adjuntos
**Contexto:** acotar la superficie.
**Decisión:** emitir/revisar en la ficha de proveedor y emitir desde la NC; sin dashboard propio ni adjuntos en v1.
**Consecuencias:** menos superficie nueva; adjuntos y recordatorios quedan diferidos.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (portal `/scar/[token]` + sección SCAR en la ficha de proveedor + emitir desde NC). Luego backend, seguridad, deploy. Después v1.5-4 Calidad predictiva.
