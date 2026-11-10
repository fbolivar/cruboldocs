# Design Spec — Ficha de Auditoría (`/app/auditorias/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/auditorias/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** conducir una auditoría de punta a punta — ver su alcance, registrar hallazgos, convertir los de no conformidad en NC, y cerrarla con conclusiones.
- **Protagonista:** la **lista de hallazgos** (el valor de la auditoría). Página completa (como la ficha de NC).
- **Acciones según rol:** planificar/iniciar/cerrar/cancelar = Líder SIG; registrar hallazgo = rol `auditor` (o Líder SIG) cuando la auditoría está **en ejecución**; generar NC desde un hallazgo = Líder SIG o el auditor.

## 2. Wireframe textual (escritorio)

```
‹ Auditorías
┌──────────────────────────────────────────────────────────────────────┐
│ AUD-2026-003 (mono)                                    [Cancelar ⋮]    │
│ Auditoría interna SGC 2026-2 (h1)                                      │
│ ■ En ejecución   Procesos: SVC, DS   Líder auditor: Auditor Interno    │
│ Planificada 2026-11-20                                                 │
│                                                                        │
│ ①Planificada ─ ②En ejecución ─ ③Cerrada    ▲ aquí                     │
│                                                                        │
│ ┌─ Alcance ──────────────────────────────────────────────────────────┐ │
│ │ Objetivo: Verificar el SGC de Servicios y Desarrollo…              │ │
│ │ Criterios: ISO 9001:2015, PR-SVC-003, normograma.                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Hallazgos ──────────────────────────────  [+ Registrar hallazgo]──┐ │
│ │ ■ No conformidad · Mayor · SVC   7.5.3                              │ │
│ │   "El procedimiento no controla la versión del formato."           │ │
│ │   [Generar no conformidad]   (o)  → NC-2026-009                     │ │
│ │ ■ Observación · DS                                                  │ │
│ │   "Registros de pruebas sin responsable asignado."                 │ │
│ │ ■ Conformidad · SVC                                                 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Conclusiones y cierre ────────────────────────────────────────────┐ │
│ │ (en ejecución) [Textarea de conclusiones]  [Cerrar auditoría]       │ │
│ │ (cerrada) "El SGC cumple salvo las NC abiertas…" — cerró Líder SIG  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Trazabilidad ─────────────────────────────────────────────────────┐ │
│ └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** código (`mono`), título (h1), **badge de estado**, procesos (códigos), líder auditor; línea `texto-sec` con fecha planificada. Menú `⋮`: "Cancelar auditoría" (Líder SIG; pide motivo).
- **Stepper** (3 pasos): paso actual con `acento`; hechos con check `exito-texto`; futuros `texto-sec`. Vertical en móvil.
- **Alcance** (card): objetivo y criterios (texto). Si vacíos, línea `texto-sec` "Sin objetivo/criterios registrados".
- **Hallazgos** (card con lista): por hallazgo: **badge de tipo** (§spec-auditorias §4; no conformidad muestra severidad), **proceso** (chip), **criterio** (`criteria_ref`, p. ej. "7.5.3", `mono` pequeño), descripción. Para los de **no conformidad**: si no tiene NC, botón **"Generar no conformidad"** (Líder SIG/auditor); si ya tiene, enlace **→ NC-2026-009** (a su ficha). El botón **"+ Registrar hallazgo"** aparece solo cuando la auditoría está **en ejecución** y el usuario es auditor/líder (abre Sheet: tipo, proceso, descripción, criterio, severidad si es NC).
- **Conclusiones y cierre** (card): en **en ejecución**, Textarea de conclusiones + botón **"Cerrar auditoría"** (Líder SIG). En **cerrada**, muestra las conclusiones y quién cerró. En **planificada**, botón **"Iniciar auditoría"** (Líder SIG) para pasar a ejecución; mientras tanto, el bloque de hallazgos indica "Inicia la auditoría para registrar hallazgos".
- **Trazabilidad** (card, timeline read-only): planificada, iniciada, hallazgos agregados, NC generadas, cerrada/cancelada. Reutiliza el patrón de la NC (`SignatureTimeline`/`NcTimeline`).

## 4. Comportamiento móvil (≤640px)

- Encabezado apila badge/metadatos; stepper vertical.
- Cada sección es una card a ancho completo; hallazgos como lista de cards (tipo + proceso arriba, descripción abajo, acción NC debajo).
- Formularios (registrar hallazgo, cerrar, cancelar) → Sheet a pantalla completa.

## 5. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + stepper + 3 cards. |
| Vacío (sin hallazgos) | En Hallazgos: "Aún no hay hallazgos" + (si en ejecución) "Registrar hallazgo". |
| Sin permiso de gestión | Solo lectura; sin botones de planificar/iniciar/cerrar/registrar. |
| Error | `SectionError` por sección + "Reintentar". Errores de formulario inline. |
| Éxito | Toasts: "Hallazgo registrado", "No conformidad NC-2026-009 generada" (y aparece el enlace), "Auditoría iniciada", "Auditoría cerrada", "Auditoría cancelada". `router.refresh()` actualiza la ficha. |

## 6. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Textarea, Select, EmptyState, SectionError | Reutilizados | |
| AuditStatusBadge, FindingTypeBadge | Reutilizados de spec-auditorias | |
| NcTimeline (patrón) | Reutilizado | para Trazabilidad |
| AuditStepper | Nuevo | 3 pasos |
| FindingList, FindingSheet, CloseAuditForm, GenerateNcButton | Nuevos | |

## 7. Decisiones y porqués

- **Página completa, no drawer:** la auditoría tiene alcance + hallazgos + cierre; merece URL propia compartible (como NC/documento), y se abre desde la tarea del líder auditor.
- **Generar NC explícito (un clic):** evita NC prematuras durante la auditoría (ADR-010); el enlace hallazgo↔NC queda visible en ambos lados.
- **Registrar hallazgo solo en ejecución:** refuerza en la UI la máquina de estados de la base.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
