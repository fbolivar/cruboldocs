# Design Spec — Tablero de objetivos de calidad / BSC (`/app/objetivos`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/estrategia/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver los **objetivos de calidad** organizados por las **4 perspectivas del Balanced Scorecard**, con su **avance** derivado de los indicadores que ya mide el Módulo 3, y gestionarlos.
- **Protagonista:** las **4 columnas/bloques de perspectiva** con sus objetivos y su avance.
- **Acciones según rol:** crear/editar/cambiar estado/ligar indicadores = Líder SIG o Líder del proceso (`can_manage_objectives`); ver = roles del SIG (`can_see_objectives`).

## 2. Wireframe textual (escritorio)

```
Objetivos de calidad (BSC) (h1)                      [ Exportar CSV ] [+ Nuevo objetivo]
[ Perspectiva ▾ ] [ Estado ▾ ] [ Proceso ▾ ]  [ Buscar… ]              (filtros)

┌─ FINANCIERA ───────────────┐ ┌─ CLIENTE ──────────────────┐
│ OBJ-2026-001  ■ Activo     │ │ OBJ-2026-003  ■ Activo     │
│ Reducir costos de no-cal.  │ │ Elevar satisfacción ≥85    │
│ Meta: −15% · 2026          │ │ Meta: ≥85/100 · 2026       │
│ 2 indicadores · ● 78% Medio│ │ 1 indicador · ● 90% Bien   │
├────────────────────────────┤ └────────────────────────────┘
│ OBJ-2026-002  ✓ Cumplido   │
│ …                          │ ┌─ PROCESOS INTERNOS ────────┐
└────────────────────────────┘ │ OBJ-2026-004  ■ Activo     │
                               │ Meta: … · sin indicadores   │
┌─ APRENDIZAJE Y CRECIMIENTO ┐ │ — · ○ Sin datos            │
│ (sin objetivos)            │ └────────────────────────────┘
└────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + **"Exportar CSV"** y **"+ Nuevo objetivo"** (este último solo si gestiona). *Sin tarjetas de resumen* (el tablero por perspectiva ya es el resumen).
- **Filtros** (lado cliente): **Perspectiva** (todas + las 4), **Estado** (todos/activo/cumplido/no_cumplido/archivado), **Proceso**, **Buscar** (código o descripción). "Limpiar filtros".
- **Tablero por perspectiva:** 4 bloques fijos — **Financiera**, **Cliente**, **Procesos internos**, **Aprendizaje y crecimiento** — cada uno con su `PerspectiveChip` de encabezado y sus objetivos como cards. Cada card: **código** (`mono`), **badge de estado**, **descripción** (protagonista), **meta** (`target_text`) y **horizonte** (año), número de **indicadores ligados** + **avance** (`ObjectiveProgress`: % + semáforo, o "Sin datos"). Card clicable abre el Sheet de edición (no hay ficha aparte). En escritorio: 2 columnas (2×2 perspectivas); en móvil: 4 bloques apilados.
- **Avance derivado** (ADR-033): se calcula en el servidor como el **% de indicadores ligados cuya última medición `cumple`**; umbral ≥80 Bien / 60–79 Medio / <60 Bajo; **sin indicadores ligados → "Sin datos"** (no se inventa número). Es solo lectura (no editable).

## 4. Sheet "Nuevo objetivo" / "Editar objetivo" (gestiona)

Campos (labels, validación inline):
- **Descripción** (textarea, req).
- **Perspectiva** (Select: financiera/cliente/procesos/aprendizaje, req).
- **Proceso** (Select de procesos, opcional).
- **Meta** (text, opcional) — p. ej. "−15%", "≥85/100".
- **Horizonte / año** (number, opcional) — año objetivo.
- **Indicadores** (multi-select de los indicadores de la organización, opcional) — los que determinan el avance. Nota: "El avance se calcula del cumplimiento de estos indicadores."
- *(Solo en edición)* **Estado** (Select: activo/cumplido/no_cumplido/archivado).

Footer: **"Crear objetivo"** / **"Guardar cambios"** (loading). Al guardar: toast, cierra, `router.refresh()`.

## 5. Comportamiento móvil (≤640px)

- Filtros apilados a ancho completo; "Buscar" a ancho completo.
- Los 4 bloques de perspectiva se apilan; dentro de cada uno, las cards a ancho completo.
- Sheets a pantalla completa; el multi-select de indicadores con lista scrolleable y checkboxes.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: filtros + 4 encabezados de perspectiva con 1–2 cards fantasma. |
| Vacío global (sin objetivos) | `EmptyState`: ícono (diana/BSC), "Aún no hay objetivos de calidad", "Define el primero con «Nuevo objetivo»" + botón (si gestiona). |
| Perspectiva vacía | El bloque muestra texto tenue "Sin objetivos en esta perspectiva" (no se oculta el bloque). |
| Objetivo sin indicadores | Avance "○ Sin datos" (neutro), no un 0%. |
| Vacío por filtro | "Ningún objetivo coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al crear/editar/cambiar estado; `router.refresh()`. |

## 7. Accesibilidad

- Contraste AA; perspectiva, estado y avance **nunca por color solo**: chip/badge con texto y el avance con número + palabra ("78%, Medio" / "Sin datos").
- Filtros y campos con `label`; foco visible; la card clicable es un botón accesible (abre el Sheet), navegable por teclado.
- El multi-select de indicadores con labels y estado marcado anunciado.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| PerspectiveChip | Nuevo | financiera/cliente/procesos/aprendizaje (4 tonos sobrios distintos, con texto) |
| ObjectiveStatusBadge | Nuevo | activo→info, cumplido→exito, no_cumplido→error, archivado→neutro |
| ObjectiveProgress | Nuevo | % + semáforo (≥80 éxito / 60–79 advertencia / <60 error) o "Sin datos" (neutro); alineado al `ScoreMeter`/`SatisfactionGauge` |
| ObjectivesBoard, ObjectiveCard, ObjectiveSheet (nuevo+editar) | Nuevo | tablero por perspectiva + Sheet |

## 9. Decisiones y porqués

- **Tablero por perspectiva, sin ficha aparte:** un objetivo es un registro corto; mostrarlo y editarlo en el tablero + Sheet basta y ahorra una vista (recorte de la L, ADR-034).
- **Avance derivado, no capturado** (ADR-033): conecta 6.2 con el 9.1 ya construido; evita el dato doble y la desincronización. "Sin datos" cuando no hay indicadores, en vez de un 0% engañoso.
- **4 perspectivas fijas y siempre visibles:** comunican el modelo BSC completo aunque alguna esté vacía.
- **Estado manual al cierre del horizonte:** el sistema no decide "cumplido/no_cumplido"; lo fija el Líder SIG con criterio.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
