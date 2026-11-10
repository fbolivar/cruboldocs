# Design Spec — No Conformidades (`/app/no-conformidades`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/no-conformidades/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver el estado de las no conformidades de su organización y saber cuáles necesitan acción (sin tratar, en verificación, con acciones vencidas).
- **Protagonista:** la **lista de no conformidades** con su estado del flujo.
- **Acción primaria:** **"Reportar no conformidad"** (cualquier miembro activo). La gestión (causa, acciones, verificación) ocurre en la ficha.

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────┐
│ No conformidades (h1)              [Exportar CSV] [+ Reportar no conformidad] │
│ ┌─ Resumen ─────────────────────────────────────────────────────────┐ │
│ │ 14 abiertas · 3 en verificación · ⚠ 5 acciones vencidas            │ │
│ │ Severidad:  ● 2 mayor   ● 7 menor   ○ 5 observación                 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [🔍 Código o descripción] [Estado ▾] [Proceso ▾] [Origen ▾] [Severidad ▾] │
│ ┌────────┬────────────────────────┬────────┬──────────┬─────────┬───────────┐
│ │Código  │Descripción             │Proceso │Origen    │Severidad│Estado     │
│ │NC-2026-│Reproceso en el…        │SVC     │Auditoría │■ Mayor  │En ejecución│
│ │  007   │                        │        │ interna  │         │⚠ 2 venc.  │
│ │NC-2026-│Queja por tiempo de…    │COM     │Queja/PQRS│■ Menor  │Verificación│
│ │  006   │                        │        │          │         │           │
│ └────────┴────────────────────────┴────────┴──────────┴─────────┴───────────┘
└──────────────────────────────────────────────────────────────────────┘
                 Clic en fila → ficha /app/no-conformidades/NC-2026-007
```

- **Resumen** (card superior, ancho completo): conteos abiertas / en verificación / **acciones vencidas** (⚠ en `error-texto`); fila de severidad (cuadro de color + nombre + cifra). Es orientación, no protagonista: tipografía `body`, sin dominar la lista.
- **Filtros:** búsqueda por código/descripción + **Estado**, **Proceso**, **Origen**, **Severidad** (todos `Select`). Por defecto muestra las **no cerradas** (Estado = "Activas"); el usuario puede incluir cerradas/anuladas.
- **Lista** (DataTable, reutiliza el patrón de `/app/riesgos` y `/app/documentos`):
  - **Código** (`mono`, p. ej. `NC-2026-007`).
  - **Descripción** (truncada a 1 línea).
  - **Proceso** (código).
  - **Origen** (texto corto: Auditoría interna/externa, Queja/PQRS, Producto o servicio, Riesgo materializado, Mejora, Otro).
  - **Severidad** (badge, ver §4).
  - **Estado** (badge de flujo, ver §4) + marca `⚠ N venc.` en `error-texto` si tiene acciones vencidas.
  - Orden por defecto: **abiertas primero**, luego por acciones vencidas y fecha de detección desc. También por Código. Paginación 25.
  - Clic en la fila → **ficha** `/app/no-conformidades/[código]` (página completa, ver `spec-ficha-no-conformidad.md`).

## 3. Reportar no conformidad (Sheet, cualquier miembro)

Drawer lateral (`Sheet`, 480px) con un formulario mínimo — reportar es fácil a propósito; el análisis lo hace luego el gestor:

- **Descripción** (Textarea, obligatoria): qué pasó.
- **Origen** (Select, obligatorio): las 7 opciones.
- **Proceso** (Select, opcional): proceso afectado.
- **Severidad** (Select: Observación / Menor / Mayor; por defecto Menor) con nota `caption`: "Un líder puede ajustarla al analizarla."
- **Fecha de detección** (date, por defecto hoy).
- Si Origen = "Riesgo materializado": aparece **Riesgo** (Select de riesgos del proceso) para enlazarlo.
- Botón primario **"Reportar"**. Aviso `small`: "Un líder del SIG recibirá el aviso y la gestionará."

No pide causa ni acciones: esas son del gestor en la ficha.

## 4. Badges (nuevos, derivados de tokens)

**Estado del flujo** (misma convención que los estados de documento, tokens.md §estados):

| Estado | Color (texto / fondo) |
|---|---|
| Abierta | `advertencia-texto` / `advertencia-suave` |
| Análisis de causa | `advertencia-texto` / `advertencia-suave` |
| Plan de acción | `acento` / `acento-suave` |
| En ejecución | `acento` / `acento-suave` |
| Verificación de eficacia | `advertencia-texto` / `advertencia-suave` |
| Cerrada | `exito-texto` / `exito-suave` |
| Anulada | `texto-sec` / `superficie-alt` |

Marca adicional **Reabierta** (si `reopened_count > 0`): chip pequeño `error-texto` / `error-suave` junto al estado.

**Severidad:**

| Severidad | Color (texto / fondo) |
|---|---|
| Observación | `texto-sec` / `superficie-alt` |
| Menor | `advertencia-texto` / `advertencia-suave` |
| Mayor | `error-texto` / `error-suave` |

El badge siempre lleva **nombre**, no solo color (accesibilidad y auditoría).

## 5. Comportamiento móvil (≤640px)

- Resumen → fila de chips (abiertas · verificación · ⚠ vencidas) y debajo los 3 de severidad.
- Filtros en hoja inferior.
- Lista → cards: Código + badge de estado, descripción, "Proceso · Origen · ■ Severidad · ⚠ N venc.".
- "Reportar" → Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: card de resumen + 6 filas (`superficie-alt`). |
| Vacío | `EmptyState` (ícono de check/alerta): "Aún no hay no conformidades registradas." + "Reportar no conformidad". Si no tiene rol SIG igual puede reportar. |
| Vacío (filtros) | "Ninguna no conformidad coincide con estos filtros." + "Limpiar filtros". |
| Error | `SectionError`: "No pudimos cargar las no conformidades." + "Reintentar". |
| Éxito | Toast "No conformidad NC-2026-008 reportada" y se abre su ficha (o vuelve a la lista con la fila nueva resaltada). Exportar: `no-conformidades-AAAA-MM-DD.csv`. |

## 7. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| DataTable, FilterBar, Sheet, Select, Badge, EmptyState, SectionError, Pagination | Reutilizados | mismos de documentos/riesgos |
| NcStatusBadge, NcSeverityBadge | Nuevos | color + nombre (tabla §4) |
| NcSummary | Nuevo | conteos + severidad |
| ReportNcSheet | Nuevo | formulario mínimo |

## 8. Decisiones y porqués

- **Reportar separado de gestionar:** bajar la barrera para que cualquiera reporte (más hallazgos), y concentrar el análisis en quien tiene el rol.
- **Resumen sobrio, lista protagonista:** a diferencia de riesgos (matriz), aquí el valor es el flujo de cada NC, no una visual agregada.
- **Código `mono` como en documentos:** consistencia; el código es la referencia de auditoría.
- **"Activas" por defecto:** el usuario quiere ver lo que requiere acción, no el histórico.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
