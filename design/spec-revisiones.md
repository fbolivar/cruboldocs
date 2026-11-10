# Design Spec — Tablero de Revisiones por la dirección (`/app/revisiones`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/revision-direccion/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver las actas de revisión por la dirección de su organización y entrar a una, o crear la del nuevo periodo.
- **Protagonista:** la **lista de actas** con su estado y periodo.
- **Acciones según rol:** crear acta = Líder SIG (`can_manage_reviews`); ver = roles del SIG (`can_see_reviews`).

## 2. Wireframe textual (escritorio)

```
Revisión por la dirección (h1)                         [+ Nueva revisión]
[ Estado ▾ ]  [ Año ▾ ]                                       (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ RD-2026-002  Revisión por la dirección 2026-2       ■ Borrador         │
│ Periodo ene–dic 2026 · Reunión 2026-12-15 · 4 decisiones               │
├──────────────────────────────────────────────────────────────────────┤
│ RD-2026-001  Revisión por la dirección 2026-1       ■ Cerrada          │
│ Periodo ene–jun 2026 · Reunión 2026-07-10 · 6 decisiones               │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + botón **"+ Nueva revisión"** (solo Líder SIG).
- **Filtros** (fila, lado cliente): **Estado** (todas/borrador/cerrada/cancelada) y **Año** (por fecha de reunión). "Limpiar filtros" cuando hay alguno activo.
- **Lista de actas** (cards/filas): por acta: **código** (`mono`), **título** (protagonista), **badge de estado**; segunda línea `texto-sec`: periodo (ene–dic 2026), fecha de reunión, nº de decisiones. Fila clicable → ficha. Orden: más reciente (fecha de reunión) primero.

## 4. Sheet "Nueva revisión" (Líder SIG)

Campos (labels, validación inline):
- **Título** (text, req; placeholder "Revisión por la dirección 2026-2").
- **Periodo** — **Desde** y **Hasta** (date, req; Hasta ≥ Desde).
- **Fecha de la reunión** (date, req).
- **Alcance / propósito** (textarea, opcional).

Footer: **"Crear acta"** (loading). Al crear: toast "Acta RD-2026-00X creada.", cierra, `router.refresh()`. Nota al pie: "Al crearla se precargan los datos del sistema del periodo; podrás editarla hasta cerrarla."

## 5. Comportamiento móvil (≤640px)

- Filtros apilados a ancho completo.
- Lista: cada acta es una card a ancho completo — código + badge arriba, título debajo, metadatos (periodo/reunión/decisiones) al pie.
- "Nueva revisión" → Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 filas de lista. Sin layout shift. |
| Vacío (sin actas) | `EmptyState`: ícono (acta/clipboard), "Aún no hay revisiones por la dirección", "Crea la primera acta del periodo" + botón "+ Nueva revisión" (si Líder SIG). |
| Vacío por filtro | "Ninguna acta coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores del formulario inline. |
| Éxito | Toast al crear; `router.refresh()`. |

## 7. Accesibilidad

- Contraste AA; el estado nunca por color solo: el badge lleva texto ("Borrador"/"Cerrada"/"Cancelada").
- Filtros y campos con `label`; foco visible; la fila clicable es un enlace (`<Link>`), navegable por teclado.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| ReviewStatusBadge | Nuevo | borrador→info, cerrada→exito, cancelada→neutro (§spec-ficha-revision) |
| ReviewBoard (lista + filtros cliente) | Nuevo | espejo de AuditBoard/IndicatorBoard |
| NewReviewSheet | Nuevo | formulario de alta |

## 9. Decisiones y porqués

- **Sin tarjetas de resumen agregadas:** a diferencia de los módulos de datos (NC/indicadores), aquí cada acta ya es un resumen del SGC; el tablero solo lista actas. Mantiene la pantalla sobria.
- **Numeración `RD-AAAA-###` visible:** el acta es un documento formal que se cita ante el auditor.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
