# Design Spec — Matriz de requisitos legales (`/app/requisitos-legales`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/requisitos-legales/ARQUITECTURA.md + ADR-041/042.

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver la **matriz legal** con el **cumplimiento vigente** de cada requisito y detectar los que están **por reevaluar**; registrar uno nuevo; exportar la matriz.
- **Protagonista:** la **lista de requisitos** con su badge de cumplimiento y su próxima evaluación.
- **Acciones según rol:** crear/editar/evaluar/derogar = Líder SIG o Líder del proceso (`can_manage_legal`); ver = roles del SIG (`can_see_legal`).

## 2. Wireframe textual (escritorio)

```
Requisitos legales (h1)                               [ Exportar CSV ] [+ Nuevo requisito]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Requisitos 24│ │ No cumple  2 │ │ Por reevaluar     3  │   (3 tarjetas resumen)
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Fuente ▾ ] [ Cumplimiento ▾ ] [ Proceso ▾ ] [ Vencimiento ▾ ]  [ Buscar… ]   (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ REQ-2026-007  ⬒ Decreto      Estándares mínimos SG-SST   ● Parcial     │
│ Dec. 1072/2015 art. 2.2.4.6 · SST · Reevaluar 2026-12-01 (en 21 días)  │
├──────────────────────────────────────────────────────────────────────┤
│ REQ-2026-006  ⬒ Norma ISO    Información documentada      ● Cumple      │
│ ISO 9001:2015 7.5 · Calidad · Reevaluar 2027-03-01                     │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + **"Exportar CSV"** y **"+ Nuevo requisito"** (solo si gestiona).
- **Resumen** (3 `StatCard`): **Requisitos vigentes**, **No cumple** (realce `error` si >0), **Por reevaluar** (próxima evaluación vencida o ≤30 días; realce `advertencia`). En móvil se apilan.
- **Filtros** (lado cliente): **Fuente** (todas + ley/decreto/resolución/norma ISO/contractual/otro), **Cumplimiento** (todos + cumple/parcial/no cumple/no evaluado), **Proceso**, **Vencimiento** (todas/vencidas/por vencer ≤30 días), **Buscar** (código, título o referencia). "Limpiar filtros".
- **Lista** (cards/filas): **código** (`mono`), **chip de fuente**, **título** (protagonista), **badge de cumplimiento vigente**; segunda línea `texto-sec`: referencia legal · proceso · "Reevaluar `fecha`" (realce `advertencia` si vencida/≤30 días). Orden: vencidas/por vencer primero, luego no cumple/parcial, luego por código. Los **derogados** se muestran atenuados y filtrables (por defecto ocultos → un toggle "Mostrar derogados"). Fila clicable → ficha.

## 4. Sheet "Nuevo requisito" (gestiona)

Campos (labels, validación inline):
- **Título** (text, req) — qué requisito es.
- **Fuente** (Select: ley/decreto/resolución/norma ISO/contractual/otro, req).
- **Referencia** (text, req) — p. ej. "Decreto 1072/2015, art. 2.2.4.6".
- **Entidad emisora** (text, opc).
- **Qué exige** (textarea, req) — descripción del requisito.
- **Proceso** (Select de procesos, opc).
- **URL** (text, opc) — enlace a la norma.
- **Frecuencia de evaluación** (Select: semestral/anual/bienal, default anual).

Footer: **"Crear requisito"** (loading). Al crear: toast "REQ-2026-0XX creado.", navega a la ficha para su primera evaluación.

## 5. Comportamiento móvil (≤640px)

- Resumen 3 tarjetas apiladas; filtros apilados a ancho completo.
- Lista: cada requisito es una card a ancho completo — código + chip de fuente + badge arriba, título debajo, referencia/proceso/reevaluación al pie.
- Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas. Sin layout shift. |
| Vacío (sin requisitos) | `EmptyState`: ícono (balanza/documento), "Aún no hay requisitos legales", "Registra el primero con «Nuevo requisito»" + botón (si gestiona). |
| Vacío por filtro | "Ningún requisito coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al crear; navega a la ficha / `router.refresh()`. |

## 7. Accesibilidad

- Contraste AA; cumplimiento y fuente **nunca por color solo** (badge/chip con texto: "Parcial", "Decreto").
- Filtros y campos con `label`; foco visible; fila clicable como `<Link>`.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| **ComplianceBadge** | Nuevo | cumple→exito, parcial→advertencia, no_cumple→error, no_evaluado→neutro |
| **SourceChip** | Nuevo | ley/decreto/resolución/norma ISO/contractual/otro (neutro) |
| LegalSummaryBar, LegalBoard, NewRequirementSheet | Nuevo | espejo de los tableros previos |

## 9. Decisiones y porqués

- **"No cumple" y "Por reevaluar" como métricas del resumen:** es lo que el auditor mira y lo que genera acción.
- **Cumplimiento vigente derivado** (ADR-041): el badge refleja la última evaluación; "No evaluado" si no hay ninguna (no se asume cumplimiento).
- **Derogados atenuados y ocultos por defecto:** conservan historial sin ensuciar la matriz activa.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
