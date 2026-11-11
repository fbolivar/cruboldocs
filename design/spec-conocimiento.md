# Design Spec — Gestión del conocimiento (`/app/conocimiento`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/conocimiento/ARQUITECTURA.md (v1.4-2) + ADR-085/086/087.

## 1. Propósito y protagonista
- **Qué logra:** consultar y curar la **base de conocimiento** (buenas prácticas, lecciones aprendidas, know-how, FAQ).
- **Protagonista:** la **lista de artículos** (lo que el equipo busca).
- **Roles:** ve = cualquier miembro activo; gestiona = Líder SIG o Líder del proceso.

## 2. Lista (`/app/conocimiento`)
```
Conocimiento (h1)                                         [+ Nuevo artículo]
┌ Resumen ───────────────────────────────────────────────────────────┐
│ Artículos 24 · Lecciones 9 · Buenas prácticas 7 · Know-how 6 · FAQ 2│
└────────────────────────────────────────────────────────────────────┘
[ Categoría ▾ ] [ Proceso ▾ ] [ Buscar… ]                 [ Exportar CSV ]

┌──────────────────────────────────────────────────────────────────────┐
│ KN-2026-012  Reproceso de lote: checklist     ◈ Lecciones aprendidas  │
│ Producción · → NC-2026-014                                            │
├──────────────────────────────────────────────────────────────────────┤
│ KN-2026-011  Plantilla de inducción           ◈ Buenas prácticas      │
└──────────────────────────────────────────────────────────────────────┘
```
- **Resumen** (`StatCard`): total + por categoría.
- **Filtros (cliente):** categoría, proceso, buscar (código/título/contenido).
- **Lista** (filas): **código** (`mono`), **título** (protagonista), **chip de categoría**; segunda línea: proceso · enlace **→ NC/AUD** de origen si existe. Fila clicable → ficha. Menú ⋯ (archivar, si gestiona). Archivados atenuados (toggle).
- **Sheet "Nuevo artículo":** **Título** (req), **Categoría** (req), **Proceso** (opc.), **Contenido** (textarea grande), **Fuente/origen** (opc.). "Crear" → `KN-AAAA-###` y navega a la ficha.

## 3. Ficha (`/app/conocimiento/[codigo]`)
- **Encabezado:** "‹ Conocimiento"; código, título, **chip de categoría**, proceso; acciones **Editar** (Sheet) y ⋯ (archivar) si gestiona.
- **Contenido:** el texto/markdown renderizado (saltos de línea respetados).
- **Origen:** fuente (texto) y enlaces **→ NC-code** / **→ AUD-code** si nació de ahí.
- Modo solo lectura si no gestiona.

## 4. "Registrar lección" (NC / auditoría)
- Botón **"Registrar lección"** en la ficha de NC y de auditoría (si gestiona): confirma y crea un artículo de **lecciones aprendidas** precargado y ligado; toast con enlace al nuevo `KN-…`.

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: resumen + filas. |
| Vacío | `EmptyState` (ícono libro/lámpara): "Aún no hay conocimiento registrado" + "Crear el primero" (si gestiona). |
| Vacío por filtro | "Nada coincide" + "Limpiar". |
| Solo lectura | Ve contenido y origen; sin editar/archivar. |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/refresh. |

## 6. Accesibilidad / Móvil
- Categoría por chip con texto; filtros con `label`; fila `<Link>`. Móvil: resumen apilado, filas como cards, Sheet a pantalla completa.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, DropdownMenu | Reutilizados | |
| **CategoryChip** | Nuevo | 4 categorías |
| KnowledgeSummaryBar, KnowledgeBoard, NewArticleSheet, ArticleRowMenu | Nuevo | espejo de otros módulos |
| **RegisterLessonButton** | Nuevo | en fichas de NC/auditoría |

## 8. Decisiones
- **Visible a todos** (ADR-086): el conocimiento se encuentra buscando; la curaduría es de los líderes.
- **Lección con un clic** (ADR-087): capitaliza NC/auditorías sin recapturar.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
