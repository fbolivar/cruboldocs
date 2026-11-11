# Arquitectura — Gestión del conocimiento (ISO 9001 7.1.6)

**Producto:** CrubolDocs · **Feature:** v1.4-2 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 9001 **7.1.6** exige **determinar, mantener y poner a disposición** el conocimiento de la organización (buenas prácticas, lecciones aprendidas, know-how). Hoy no tenemos un lugar para eso; Isolución/SoftExpert lo venden.
- **Acción de valor:** una **base de conocimiento** ligera: artículos categorizados, buscables, ligados a procesos, **disponibles para todo el equipo**; y **capturar una lección aprendida desde una NC o auditoría con un clic**.
- **Decisiones (Fernando):** entidad propia ligera; campos = categoría + proceso + contenido + fuente/origen; registrar lección desde NC/auditoría; **ve cualquier miembro activo** (gestiona Líder SIG / Líder del proceso).
- **Cobro:** incluido. Dato personal: ninguno nuevo (contenido del SGC).

## 2. Modelo de dominio
Multi-tenant; patrón RLS + RPC. Una entidad nueva + contador.

### `knowledge_articles`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | |
| code | text | `KN-AAAA-###` (contador `kn_counters`) |
| title | text NOT NULL | |
| category | text CHECK in ('buenas_practicas','lecciones_aprendidas','know_how','faq') | |
| content | text NOT NULL | texto/markdown del conocimiento |
| process_id | uuid NULL → processes (id, org) | proceso dueño |
| source | text NULL | de dónde salió (texto libre) |
| source_nc_id | uuid NULL → nonconformities (id, org) | si nació de una NC |
| source_audit_id | uuid NULL → audits (id, org) | si nació de una auditoría |
| status | text CHECK in ('vigente','archivado') default 'vigente' | baja lógica |
| created_by | uuid default auth.uid() | |
| created_at / updated_at | timestamptz | |

FKs compuestas `(id, organization_id)`; índice `(organization_id, category)`; `kn_counters` deny-all.

### Visibilidad y gestión (ADR-086)
- **Ve:** cualquier **miembro activo** (`is_active_member`) — el conocimiento debe estar disponible (RLS select por `is_active_member`).
- **Gestiona** (crear/editar/archivar): Líder SIG o Líder del proceso (`can_manage_knowledge`).

### Integración (ADR-087)
- `create_article_from_nc(p_nc)` / `create_article_from_audit(p_audit)`: precargan título ("Lección — <código>"), categoría `lecciones_aprendidas`, proceso y `source`/`source_nc_id`/`source_audit_id`; autorizan por `can_manage_knowledge` del proceso. Botón "Registrar lección" en la ficha de NC y de auditoría. `log_event` (entity `Conocimiento`).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Artículos (KN-AAAA-###) con categoría, proceso, contenido, fuente | **Sí** | Núcleo 7.1.6 |
| Base visible para todo miembro activo; buscar/filtrar | **Sí** | "Disponible" (decisión de Fernando) |
| Registrar lección desde NC / auditoría (un clic) | **Sí** | El valor de 7.1.6 (decisión de Fernando) |
| Exportar CSV + baja lógica | **Sí** | Paridad |
| Comentarios / valoración de artículos | No | Diferido |
| Adjuntos / imágenes en el artículo | No | Diferido |
| Versionado del artículo | No | Diferido (baja lógica + audit_log) |

**Camino dorado:** cerrar una NC → "Registrar lección" → se crea un artículo de **lecciones aprendidas** ligado a esa NC → cualquier miembro lo encuentra buscando en `/app/conocimiento`.

## 4. Mapa de rutas
- **`/app/conocimiento`** (lista): resumen por categoría + lista con filtros (categoría, proceso, buscar) + Sheet "Nuevo artículo" (si gestiona). **Ve:** cualquier miembro (`canSeeKnowledge`).
- **`/app/conocimiento/[codigo]`** (ficha): contenido, metadatos, enlaces a la NC/auditoría de origen; editar/archivar si gestiona.
- Botón **"Registrar lección"** en `/app/no-conformidades/[codigo]` y `/app/auditorias/[codigo]`.
- Ítem de menú "Conocimiento" (ícono libro/lámpara).

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Visibilidad amplia filtra datos sensibles** → la base es conocimiento general (no registros con PII); el contenido lo redacta quien gestiona; sin adjuntos en v1.
2. **Vínculos huérfanos** (NC/auditoría borrada) → FKs `on delete set null`; la UI degrada con gracia.
3. **Ruido/duplicados** → categoría + proceso + búsqueda; baja lógica para depurar.

## ADRs

### ADR-085 — Base de conocimiento como entidad propia ligera
**Contexto:** capturar know-how debe ser rápido; el control documental (versiones/PDF/aprobación) es demasiado pesado para esto.
**Decisión:** `knowledge_articles` con contenido texto/markdown, categoría y proceso; numeración `KN-AAAA-###`; sin versionado (baja lógica).
**Consecuencias:** captura ágil; para un documento formal se usa el control documental; el historial queda en `audit_log`.

### ADR-086 — Visible para todo miembro activo; gestiona el líder
**Contexto:** 7.1.6 pide poner el conocimiento "a disposición".
**Decisión:** RLS select por `is_active_member`; `can_manage_knowledge` (Líder SIG / Líder del proceso) para escribir.
**Consecuencias:** conocimiento disponible al equipo; la curaduría queda en los líderes.

### ADR-087 — Lección aprendida desde NC / auditoría
**Contexto:** el mayor valor de 7.1.6 es capitalizar lo aprendido en no conformidades y auditorías.
**Decisión:** `create_article_from_nc`/`create_article_from_audit` precargan el artículo y lo enlazan; botón en ambas fichas.
**Consecuencias:** integración 10.2/9.2 → 7.1.6 con un clic; trazabilidad al origen.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (lista + ficha + botón "Registrar lección"). Luego backend, seguridad, deploy. Después #3 Portal externo.
