# Design Spec — Ficha de acta (`/app/actas/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/estrategia/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** consultar el acta (datos, asistentes, temas), registrar y seguir sus **compromisos** (cada uno genera una **tarea**), marcarlos **cumplidos**, y **cerrar** el acta.
- **Protagonista:** la **lista de compromisos** con su responsable, plazo y estado.
- **Acciones según rol:** editar/cerrar/agregar compromiso/marcar cumplido = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Wireframe textual (escritorio)

```
‹ Actas
ACT-2026-009  ⬒ Comité              ◻ Borrador          [ Editar ] [ Cerrar acta ]
Reunión: Revisión mensual SIG · 2026-11-05 · Proceso Calidad

DATOS
Tipo Comité · Fecha 2026-11-05 · Proceso Calidad
Asistentes (dato personal): Ana Ruiz, Juan Pérez, invitado externo J. Gómez
Temas: "1. Seguimiento de acciones. 2. Indicadores de octubre…"

COMPROMISOS (3)                                          [ + Agregar compromiso ]
┌──────────────────────────────────────────────────────────────────────┐
│ Actualizar el procedimiento PR-07     Resp: Coord. Calidad             │
│ Vence 2026-11-20 · ◻ Pendiente                         [ Marcar cumplido ]│
├──────────────────────────────────────────────────────────────────────┤
│ Capacitar al equipo comercial         Resp: Líder Comercial            │
│ Vence 2026-11-15 · ■ Cumplido                                          │
└──────────────────────────────────────────────────────────────────────┘

TRAZABILIDAD
• 2026-11-05  Ana creó el acta …
```

## 3. Secciones

- **Encabezado:** "‹ Actas"; **código** (`mono`), **chip de tipo**, **badge de estado**, título de la reunión, fecha, proceso; acciones **"Editar"** y **"Cerrar acta"** (solo en estado `borrador` y si gestiona).
- **Datos:** tipo, fecha, proceso; bloque **asistentes (dato personal)**; **temas/orden del día**. Se editan en el Sheet "Editar" (solo en borrador).
- **Compromisos:** lista con **descripción**, **responsable** (cargo), **plazo**, **badge de estado** (pendiente/cumplido). **"+ Agregar compromiso"** (si gestiona y acta en borrador) abre un Sheet; al crear, se **genera una tarea** `cumplir_compromiso` al cargo responsable. **"Marcar cumplido"** por compromiso (completa su tarea). Vacío: "Esta acta aún no tiene compromisos".
- **Trazabilidad:** `NcTimeline` con los eventos del acta (creación, edición, compromisos agregados/cumplidos, cierre).

## 4. Sheets

- **"Editar acta"** (solo borrador): título, tipo, fecha, proceso, asistentes (dato personal), temas. "Guardar cambios".
- **"Agregar compromiso"** (solo borrador): **descripción** (textarea, req), **responsable** (Select de cargos, opcional), **plazo** (date, opcional). "Agregar". Nota: "Se creará una tarea para el cargo responsable."

## 5. Cierre del acta

- **"Cerrar acta"** pide confirmación ("Una vez cerrada, el acta queda en solo lectura"). Al cerrar: estado → **Cerrada**; ya no se editan datos ni se agregan compromisos. Los compromisos **ya creados** siguen pudiéndose marcar **cumplido** (su tarea sigue viva) — el seguimiento no termina con el cierre del acta.

## 6. Comportamiento móvil (≤640px)

- Encabezado apilado; acciones a ancho completo (botones apilados).
- Secciones una debajo de otra; cada compromiso es una card a ancho completo (descripción arriba; responsable/plazo/estado al pie; "Marcar cumplido" a ancho completo).
- Sheets a pantalla completa.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + sección datos + 2 filas de compromisos. |
| Vacío (sin compromisos) | `EmptyState` en la sección: "Esta acta aún no tiene compromisos" + "Agregar compromiso" (si gestiona y borrador). |
| Cerrada | Solo lectura en datos y en "agregar"; los compromisos existentes conservan "Marcar cumplido". |
| Solo lectura (no gestiona) | Sin acciones; ficha completa visible. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al guardar/agregar/cerrar/cumplir; `router.refresh()`. |

## 8. Accesibilidad

- Estado del acta y del compromiso **nunca por color solo** (badge con texto). 
- El bloque de asistentes se anuncia como **dato personal**; campos con `label`.
- "Cerrar acta" confirma la acción (pasa a solo lectura).

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| MinuteStatusBadge, MeetingTypeChip | Nuevo (compartidos con spec-actas) | |
| CommitmentStatusBadge | Nuevo | pendiente→advertencia, cumplido→exito |
| EditMinuteSheet, AddCommitmentSheet, CloseMinuteButton, CommitmentRow | Nuevo | edición/compromiso/cierre |

## 10. Decisiones y porqués

- **Compromiso → tarea** (ADR-032): reutiliza tareas+cron; el responsable recibe recordatorio al vencer. Marcar cumplido completa la tarea.
- **El cierre no congela el seguimiento:** cerrar el acta la vuelve solo lectura, pero sus compromisos vivos se siguen cumpliendo — el acuerdo no caduca porque se firme el acta.
- **Edición solo en borrador:** una vez cerrada, el acta es evidencia; no se reescribe (si hay error, se levanta una nota en otra acta o se reabre fuera del MVP).
- **Sin firma** (ADR-032): "Cerrar" en lugar de "Firmar".

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
