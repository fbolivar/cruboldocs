# Design Spec — Tablero de actas (`/app/actas`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/estrategia/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver las **actas** de las reuniones del SIG, distinguir las que siguen en **borrador**, saber cuántos **compromisos** quedan **pendientes**, y levantar una acta nueva.
- **Protagonista:** la **lista de actas** con su estado y su número de compromisos.
- **Acciones según rol:** crear/editar/cerrar = Líder SIG o Líder del proceso del acta (`can_manage_minutes`); ver = roles del SIG (`can_see_minutes`).

## 2. Wireframe textual (escritorio)

```
Actas de reunión (h1)                                [ Exportar CSV ] [+ Nueva acta]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│ Actas 2026  9│ │ Borradores  2│ │ Compromisos pendientes 5 │   (3 tarjetas resumen)
└──────────────┘ └──────────────┘ └──────────────────────────┘
[ Tipo ▾ ] [ Estado ▾ ] [ Año ▾ ] [ Proceso ▾ ]  [ Buscar… ]          (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ ACT-2026-009  ⬒ Comité        Revisión mensual SIG     ◻ Borrador      │
│ 2026-11-05 · Calidad · 3 compromisos (2 pendientes)                    │
├──────────────────────────────────────────────────────────────────────┤
│ ACT-2026-008  ⬒ Seguimiento   Cierre de acciones Q3    ■ Cerrada       │
│ 2026-10-28 · Comercial · 4 compromisos                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + **"Exportar CSV"** y **"+ Nueva acta"** (este último solo si gestiona).
- **Resumen** (3 `StatCard`): **Actas del año** (conteo del año en curso), **Borradores** (status `borrador`), **Compromisos pendientes** (suma de `meeting_commitments` en estado `pendiente`, en toda acta visible). En móvil se apilan.
- **Filtros** (lado cliente): **Tipo** (todos + los tipos usados: comité/seguimiento/otro — texto libre, se poblan de los datos), **Estado** (todos/borrador/cerrada), **Año** (de `meeting_date`), **Proceso**, **Buscar** (código o título). "Limpiar filtros".
- **Lista** (cards/filas): **código** (`mono`), **chip de tipo**, **título** (protagonista), **badge de estado**; segunda línea `texto-sec`: `fecha` · proceso · "N compromisos (M pendientes)" (el "(M pendientes)" en realce `advertencia` si M>0). Orden: borradores primero, luego por fecha de reunión reciente. Fila clicable → ficha.

## 4. Sheet "Nueva acta" (gestiona)

Campos (labels, validación inline):
- **Título** (text, req).
- **Tipo de reunión** (text o Select con creación libre: comité/seguimiento/otro, req).
- **Fecha de la reunión** (date, req, no futura).
- **Proceso** (Select de procesos, opcional).
- **Asistentes** (textarea, opcional) — *dato personal; registra solo los nombres necesarios para dejar constancia*.
- **Temas / orden del día** (textarea, opcional).

Footer: **"Crear acta"** (loading). Al crear: toast "ACT-2026-0XX creada.", cierra, navega a la ficha (o `router.refresh()`). El acta nace en **borrador**; los compromisos se agregan en la ficha.

## 5. Comportamiento móvil (≤640px)

- Resumen: 3 tarjetas apiladas. Filtros apilados a ancho completo; "Buscar" a ancho completo.
- Lista: cada acta es una card a ancho completo — código + chip de tipo + badge arriba, título debajo, metadatos (fecha/proceso/compromisos) al pie.
- Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas. Sin layout shift. |
| Vacío (sin actas) | `EmptyState`: ícono (documento/reunión), "Aún no hay actas", "Crea la primera con «Nueva acta»" + botón (si gestiona). |
| Vacío por filtro | "Ninguna acta coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al crear; navega a la ficha / `router.refresh()`. |

## 7. Accesibilidad

- Contraste AA; estado y tipo **nunca por color solo**: badge/chip con texto ("Borrador", "Comité").
- Filtros y campos con `label`; foco visible; la fila clicable es un enlace (`<Link>`), navegable por teclado.
- Aviso de dato personal junto al campo de asistentes.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| MinuteStatusBadge | Nuevo | borrador→advertencia (o neutro-suave), cerrada→exito |
| MeetingTypeChip | Nuevo | comité/seguimiento/otro (texto libre; tono neutro) |
| MinutesSummaryBar, MinutesBoard, NewMinuteSheet | Nuevo | espejo de los tableros previos |

## 9. Decisiones y porqués

- **"Compromisos pendientes" como métrica del resumen:** el valor de una acta es el seguimiento de sus acuerdos, no el acta en sí.
- **Borradores primero en el orden:** son las que requieren acción (cerrarlas o completarlas).
- **Sin firma** en el flujo (ADR-032): el acta se "cierra", no se firma; la firma formal vive en la Revisión por la dirección.
- **Asistentes como texto y señalizado** como dato personal: minimización; no se modela una entidad de personas externas en v1.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
