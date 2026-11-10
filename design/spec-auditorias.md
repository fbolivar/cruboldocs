# Design Spec — Auditorías internas (`/app/auditorias`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/auditorias/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver el programa de auditorías internas y su estado (planificadas, en curso, cerradas) y entrar a cada una.
- **Protagonista:** la **lista de auditorías** con su estado.
- **Acción primaria:** **"Planificar auditoría"** (Líder SIG). Registrar hallazgos ocurre dentro de la ficha.

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Auditorías internas (h1)                     [Exportar CSV] [+ Planificar auditoría] │
│ ┌─ Resumen ─────────────────────────────────────────────────────────┐ │
│ │ 2 planificadas · 1 en ejecución · 5 cerradas (2026) · ⚠ 3 hallazgos NC │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [🔍 Código o título] [Estado ▾] [Proceso ▾] [Año ▾]                    │
│ ┌────────────┬────────────────────────┬──────────┬────────────┬──────────┬──────────┐
│ │Código      │Título                  │Procesos  │Líder auditor│Fecha     │Estado    │
│ │AUD-2026-003│Auditoría SGC 2026-2    │SVC, DS   │Auditor Int. │2026-11-20│En ejecución│
│ │            │                        │          │             │          │ 4 hallazgos│
│ │AUD-2026-002│Auditoría de TI         │TI        │Auditor Int. │2026-09-10│Cerrada    │
│ └────────────┴────────────────────────┴──────────┴────────────┴──────────┴──────────┘
└──────────────────────────────────────────────────────────────────────┘
                 Clic en fila → ficha /app/auditorias/AUD-2026-003
```

- **Resumen** (card superior, ancho completo): conteos por estado del año en curso + hallazgos de no conformidad (⚠ en `error-texto`). Orientación, no protagonista (`body`).
- **Filtros:** búsqueda por código/título + **Estado**, **Proceso**, **Año** (Select). Por defecto muestra las **no canceladas**.
- **Lista** (DataTable, mismo patrón que No Conformidades/Documentos/Riesgos):
  - **Código** (`mono`, `AUD-2026-003`, enlace).
  - **Título** (truncado 1 línea).
  - **Procesos** (códigos separados por coma; si >3, "+N").
  - **Líder auditor** (nombre del cargo).
  - **Fecha** (planificada; `formatDate`).
  - **Estado** (badge, §4) + `N hallazgos` en `caption` si tiene.
  - Orden: por fecha planificada desc; también por Código. Paginación 25. Clic → ficha `/app/auditorias/[código]`.

## 3. Planificar auditoría (Sheet, Líder SIG)

Drawer lateral (`Sheet`, 480px):
- **Título** (Input, obligatorio): p. ej. "Auditoría interna SGC 2026-2".
- **Objetivo** (Textarea, opcional).
- **Criterios** (Textarea, opcional): ISO 9001, procedimientos, normograma.
- **Procesos** (multi-select o lista de checkboxes de los procesos de la organización; al menos uno).
- **Líder auditor** (Select de cargos con rol `auditor`).
- **Fecha planificada** (date, ≥ hoy).
- Botón **"Planificar"**. Aviso `small`: "El líder auditor recibirá la tarea de conducirla."

## 4. Badges (nuevos, derivados de tokens)

**Estado de la auditoría** (misma convención que los estados de documento/NC):

| Estado | Color (texto / fondo) |
|---|---|
| Planificada | `advertencia-texto` / `advertencia-suave` |
| En ejecución | `acento` / `acento-suave` |
| Cerrada | `exito-texto` / `exito-suave` |
| Cancelada | `texto-sec` / `superficie-alt` |

**Tipo de hallazgo** (se usa en la ficha, §spec-ficha-auditoria):

| Tipo | Color (texto / fondo) |
|---|---|
| No conformidad | `error-texto` / `error-suave` (muestra la severidad: menor/mayor) |
| Observación | `advertencia-texto` / `advertencia-suave` |
| Oportunidad de mejora | `acento` / `acento-suave` |
| Conformidad | `exito-texto` / `exito-suave` |

El badge siempre lleva **nombre**, no solo color.

## 5. Comportamiento móvil (≤640px)

- Resumen → fila de chips (planificadas · en ejecución · cerradas · ⚠ NC).
- Filtros en hoja inferior.
- Lista → cards: Código + badge de estado, título, "Procesos · Líder · Fecha · N hallazgos".
- "Planificar" → Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: card de resumen + 6 filas (`superficie-alt`). |
| Vacío | `EmptyState` (ícono de lista de verificación): "Aún no hay auditorías." + "Planificar auditoría" (si Líder SIG). |
| Vacío (filtros) | "Ninguna auditoría coincide con estos filtros." + "Limpiar filtros". |
| Error | `SectionError`: "No pudimos cargar las auditorías." + "Reintentar". |
| Éxito | Toast "Auditoría AUD-2026-004 planificada" y se abre su ficha. Exportar: `auditorias-AAAA-MM-DD.csv`. |

## 7. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| DataTable, FilterBar, Sheet, Select, Badge, Chip, EmptyState, SectionError, Pagination | Reutilizados | mismos de No Conformidades |
| AuditStatusBadge, FindingTypeBadge | Nuevos | color + nombre (tabla §4) |
| AuditSummary | Nuevo | conteos |
| PlanAuditSheet | Nuevo | con selección de procesos y líder auditor |

## 8. Decisiones y porqués

- **Mismo lenguaje que No Conformidades:** consistencia de módulos del SIG; el usuario reconoce lista + ficha + Sheets.
- **"No canceladas" por defecto:** se quiere ver lo vigente.
- **Código `mono`:** referencia de auditoría, como documentos/NC.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
