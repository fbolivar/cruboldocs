# Design Spec — Ficha de Revisión por la dirección (`/app/revisiones/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/revision-direccion/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** conducir el acta de punta a punta — revisar las entradas (el desempeño del SGC precargado + las de texto), registrar las decisiones, y cerrarla con firma.
- **Protagonista:** las **ENTRADAS** (el panorama del SGC consolidado) junto con las **SALIDAS** (las decisiones). Página completa (como NC/Auditorías/Indicadores).
- **Acciones según rol:** crear/editar entradas/agregar salidas/refrescar snapshot = Líder SIG; cerrar y firmar = Líder SIG (representante de la dirección); ver = roles del SIG. Tras **cerrada**, todo es solo lectura.

## 2. Wireframe textual (escritorio)

```
‹ Revisiones
┌──────────────────────────────────────────────────────────────────────┐
│ RD-2026-002 (mono)                                      [Cancelar ⋮]   │
│ Revisión por la dirección 2026-2 (h1)                                  │
│ ■ Borrador   Periodo ene–dic 2026 · Reunión 2026-12-15                 │
│                                                                        │
│ ①Borrador ─ ②Cerrada           ▲ aquí                                 │
│                                                                        │
│ ┌─ Entradas (9.3.2) ───────────────────  [Actualizar datos del sistema]┐
│ │ ┌ No conformidades ┐ ┌ Auditorías ┐ ┌ Indicadores ┐                 │
│ │ │ 3 abiertas       │ │ 2 realizadas│ │ 78% cumplen │   (SnapshotCards)│
│ │ │ 5 cerradas       │ │ 1 hallazgo  │ │ 2 en riesgo │                 │
│ │ │ 4 eficaces       │ │   NC        │ │ 1 no cumple │                 │
│ │ └──────────────────┘ └────────────┘ └─────────────┘                 │
│ │ ┌ Riesgos ┐ ┌ Documentos ┐ ┌ Acciones de la revisión previa ┐       │
│ │ │ 2 altos │ │ 40 vigentes│ │ 3 compromisos · 1 pendiente     │       │
│ │ │ 90% ctrl│ │ 3 por venc.│ └─────────────────────────────────┘       │
│ │ └─────────┘ └────────────┘                                          │
│ │ ── Entradas de texto ──                                             │
│ │ Satisfacción del cliente:  [textarea]                               │
│ │ Retroalimentación / quejas: [textarea]                              │
│ │ Desempeño de proveedores:   [textarea]                              │
│ │ Adecuación de recursos:     [textarea]                              │
│ │ Oportunidades de mejora:    [textarea]                              │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌─ Salidas · Decisiones (9.3.3) ─────────────  [+ Agregar decisión]──┐ │
│ │ ◇ Acción de mejora · resp. Líder TI · vence 2027-01-31             │ │
│ │   "Implementar monitoreo de disponibilidad."                       │ │
│ │   [Generar no conformidad]  (o)  → NC-2026-012                     │ │
│ │ ◇ Recurso · resp. Gerencia                                         │ │
│ │   "Aprobar presupuesto de capacitación 2027."                      │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌─ Cierre y firma ───────────────────────────────────────────────────┐ │
│ │ (borrador) [Cerrar y firmar]  → pide reautenticación               │ │
│ │ (cerrada)  Firmada por Juan Pérez (Líder SIG) · 2026-12-15 14:20    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌─ Trazabilidad ─────────────────────────────────────────────────────┐ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** código (`mono`), título (h1), **badge de estado**, periodo y fecha de reunión (`texto-sec`). Menú `⋮`: "Cancelar acta" (Líder SIG, en borrador; pide motivo). Oculto si cerrada/cancelada.
- **Stepper** (2 pasos Borrador→Cerrada; si cancelada, se indica el estado terminal). Paso actual con `acento`; hecho con check `exito-texto`.
- **Entradas (9.3.2)** (card):
  - **Snapshot** = grid de **SnapshotCards** (§6): No conformidades, Auditorías, Indicadores, Riesgos, Documentos, y "Acciones de la revisión previa". Botón **"Actualizar datos del sistema"** (solo en borrador; recalcula el snapshot y hace `router.refresh()`; toast "Datos actualizados"). En cerrada, los datos son los congelados (sin botón).
  - **Entradas de texto**: 5 `Textarea` (satisfacción, retroalimentación, proveedores, recursos, oportunidades de mejora). Editables en borrador con autoguardado al salir del campo o un botón "Guardar entradas"; en cerrada, texto plano de solo lectura (si vacío: "—").
- **Salidas · Decisiones (9.3.3)** (card con lista): por salida: **chip de tipo** (Decisión / Acción de mejora / Recurso / Cambio del SGC), descripción, responsable (cargo) y plazo (`texto-sec`). Para las de **acción de mejora**: si no tiene NC, botón **"Generar no conformidad"** (Líder SIG); si ya tiene, enlace **→ NC-2026-012**. Botón **"+ Agregar decisión"** (solo en borrador; abre Sheet: tipo, descripción, responsable opcional, plazo opcional).
- **Cierre y firma** (card): en **borrador**, botón **"Cerrar y firmar"** (Líder SIG) → abre el **modal de reautenticación** (mismo patrón que firmar un documento: pide la contraseña, declara el significado "Apruebo esta acta de revisión por la dirección"); al confirmar, el acta pasa a **cerrada**. En **cerrada**, muestra "Firmada por <persona> (<cargo>) · <fecha/hora Bogotá>" y una nota "El acta cerrada es un registro inmutable." En **cancelada**, nota con el motivo.
- **Trazabilidad** (card, timeline read-only): creada, datos actualizados, decisiones agregadas, NC generadas, cerrada/cancelada. Reutiliza `NcTimeline`.

## 4. Comportamiento móvil (≤640px)

- Encabezado apila badge/metadatos; stepper vertical.
- SnapshotCards en grid de 1–2 columnas (`grid-cols-1 sm:grid-cols-2`); cada card a ancho completo.
- Entradas de texto a ancho completo; salidas como lista de cards (chip + descripción arriba, responsable/plazo y acción NC al pie).
- Formularios (nueva decisión, cancelar) y el modal de firma → Sheet/modal a pantalla completa.

## 5. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + stepper + card de entradas (6 bloques gris) + card de salidas (2 filas). |
| Vacío (sin decisiones) | En Salidas: "Aún no hay decisiones" + (si borrador) "Agregar decisión". |
| Snapshot sin datos | Cada SnapshotCard muestra 0 / "—" con su etiqueta; nunca una card en blanco. Nota: "Sin datos de este bloque en el periodo." |
| Cerrada (solo lectura) | Sin botones de editar/actualizar/agregar/cerrar; entradas de texto y salidas en modo lectura; se mantiene "Trazabilidad" y el bloque de firma. |
| Sin permiso de gestión | Solo lectura aunque esté en borrador; sin botones de gestión. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario/firma inline. |
| Éxito | Toasts: "Datos actualizados", "Decisión agregada", "No conformidad NC-2026-012 generada" (+ enlace), "Acta cerrada y firmada", "Acta cancelada". `router.refresh()`. |

## 6. SnapshotCard (componente de presentación nuevo)

- **Forma:** `Card` con título del bloque (`text-small` `texto-sec`) y 2–4 **métricas**: cada una un número grande (`font-display text-h3` tabular-nums) + etiqueta (`caption`). Tono del número según semántica cuando aplique (p. ej. "no cumplen" / "altos" / "por vencer" en `error-texto` o `advertencia-texto`; el resto en `texto`).
- **Props:** `title`, `items: { value: string; label: string; tone?: 'texto'|'exito'|'advertencia'|'error' }[]`.
- **Bloques del MVP:** No conformidades (abiertas/cerradas/eficaces), Auditorías (realizadas/hallazgos NC), Indicadores (% cumplen/en riesgo/no cumplen), Riesgos (altos/controles a tiempo %), Documentos (vigentes/por vencer), Acciones de la revisión previa (total/pendientes).
- **Accesibilidad:** cada métrica es texto (no solo color); el tono es refuerzo, no el único canal.

## 7. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| ReviewStatusBadge | Reutilizado de spec-revisiones | |
| NcTimeline (patrón) | Reutilizado | Trazabilidad |
| Modal/flujo de reautenticación para firmar | Reutilizado | mismo patrón que firmar un documento (ADR-004) |
| SnapshotCard | Nuevo | §6 |
| ReviewInputsForm, ReviewOutputList, AddOutputSheet, CloseReviewButton, GenerateNcButton | Nuevos | GenerateNcButton reutiliza el patrón de Auditorías/Indicadores |

## 8. Decisiones y porqués

- **Snapshot como tarjetas, no tabla:** la dirección lee un panorama, no una hoja de cálculo; las SnapshotCards dan el golpe de vista que el auditor y el gerente esperan.
- **"Actualizar datos" solo en borrador:** refuerza en la UI que el acta es una foto que se **congela al cerrar** (ADR-016).
- **Cerrar = firmar en un paso:** el cierre es el acto formal; exigir reautenticación evita cierres accidentales y da no repudio (ADR-018). Tras cerrar, todo es solo lectura (inmutable).
- **Acción de mejora → NC con un clic:** cierra el lazo revisión→mejora reutilizando el ciclo CAPA (ADR-017), consistente con hallazgos de auditoría y mediciones de indicador.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
