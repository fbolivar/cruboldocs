# Design Spec — Ficha de No Conformidad (`/app/no-conformidades/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/no-conformidades/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** llevar una no conformidad por todo su ciclo — entender qué pasó, su causa, las acciones, su evidencia y la verificación de eficacia — hasta cerrarla.
- **Protagonista:** el **avance del ciclo** (el indicador de estado + las acciones). Es una página completa (no drawer), como la ficha de documento.
- **Acciones según rol:** gestión (causa, acciones, cancelar) = Líder SIG / Líder de proceso; completar acción = responsable de la acción; verificar eficacia = Líder SIG o dueño.

## 2. Wireframe textual (escritorio)

```
‹ No conformidades
┌──────────────────────────────────────────────────────────────────────┐
│ NC-2026-007 (mono)                                     [Cancelar NC ⋮] │
│ Reproceso en la entrega de soporte (h1)                                │
│ ■ En ejecución   ■ Mayor   Proceso: SVC   Origen: Auditoría interna    │
│ Dueño: Líder de Servicios TI · Detectada 2026-11-08 · por Ana Pérez    │
│                                                                        │
│ ── Progreso ──────────────────────────────────────────────────────── │
│ ①Abierta ─ ②Causa ─ ③Plan ─ ④Ejecución ─ ⑤Verificación ─ ⑥Cerrada     │
│                              ▲ aquí                                     │
│                                                                        │
│ ┌─ Análisis de causa ───────────────────────────────────────────────┐ │
│ │ "El procedimiento no define el reintento…"            [Editar]     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Plan de acción ────────────────────────────────  [+ Agregar acción]┐ │
│ │ ◻ Correctiva · Actualizar PR-SVC-003            Líder SVC · vence 11-20│
│ │   [Marcar hecha] [Evidencia]                                        │ │
│ │ ✔ Corrección · Reprocesar el caso del cliente   Analista · hecha 11-09│ │
│ │ ⚠ Preventiva · Capacitar al equipo              RRHH · venció 11-15  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Verificación de eficacia ─────────────────────────────────────────┐ │
│ │ Pendiente: se habilita cuando todas las acciones estén hechas.      │ │
│ │ (cuando aplique) ◉ Eficaz  ○ No eficaz  [Notas]  [Verificar y cerrar]│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Trazabilidad ─────────────────────────────────────────────────────┐ │
│ │ 2026-11-09 Ana completó "Reprocesar el caso" · 2026-11-08 creada…   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** código (`mono`), descripción (h1), **badge de estado** + **badge de severidad** + proceso + origen; línea `texto-sec` con dueño (cargo), fecha de detección y reportante. Menú `⋮`: "Cancelar no conformidad" (gestor; pide motivo), y editar severidad/dueño/proceso (gestor).
- **Progreso** (stepper horizontal, 6 pasos): paso actual con `acento`; pasos hechos con check `exito-texto`; futuros en `texto-sec`. En móvil, vertical. Es orientación visual del ciclo.
- **Análisis de causa** (card): texto de la causa raíz; botón **"Editar"** (gestor) abre un `Textarea` inline. Si está vacía: `EmptyState` compacto "Aún sin análisis de causa" + "Analizar causa" (gestor). Fijar la causa es lo que mueve de *Abierta* a *Plan de acción*.
- **Plan de acción** (card con lista): por acción una fila/card con: **tipo** (chip: Corrección / Correctiva / Preventiva), descripción, **responsable** (cargo), **vence** (fecha; `⚠` en `error-texto` si venció y no está hecha), **estado** (badge de acción). Acciones de fila: **"Marcar hecha"** (responsable o gestor) y **"Evidencia"**; el gestor ve **"+ Agregar acción"** (abre Sheet: tipo, descripción, responsable, fecha límite). Cuando **todas** las acciones quedan hechas, la NC pasa a *Verificación*.
- **Evidencias** (dentro de cada acción o sección propia): lista de adjuntos (nombre, fecha, quien registró); registrar evidencia reutiliza el patrón de evidencias de control (archivo ≤25 MB + nota; aviso "no se puede editar después"). 
- **Verificación de eficacia** (card): deshabilitada con nota mientras haya acciones sin terminar. Cuando aplica: radio **Eficaz / No eficaz**, **Notas** (Textarea), botón **"Verificar y cerrar"** (Líder SIG o dueño). *No eficaz* → la NC **vuelve a Plan de acción** (reabre, `reopened_count++`) con aviso. *Eficaz* → **Cerrada**.
- **Trazabilidad** (card, timeline read-only): eventos de la auditoría del módulo (creada, causa, acciones agregadas/completadas, verificación, reapertura, cierre) con fecha y actor. Reutiliza el patrón de `signature-timeline`.

## 4. Badges de acción (nuevos)

| Estado de acción | Color (texto / fondo) |
|---|---|
| Pendiente | `texto-sec` / `superficie-alt` |
| En curso | `acento` / `acento-suave` |
| Hecha | `exito-texto` / `exito-suave` |
| Cancelada | `texto-sec` / `superficie-alt` (atenuada) |
| Vencida (marca) | `⚠` `error-texto` junto a la fecha |

Chips de **tipo de acción** (Corrección / Correctiva / Preventiva): estilo neutro `superficie-alt` + texto `texto`.

## 5. Comportamiento móvil (≤640px)

- Encabezado apila badges; stepper vertical compacto.
- Cada sección es una card a ancho completo; el plan de acción como lista de cards (tipo + estado arriba, responsable y vence abajo).
- Formularios (agregar acción, evidencia, verificar) → Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + stepper + 3 cards. |
| Vacío (sin acciones) | En Plan de acción: "Aún no hay acciones" + "Agregar acción" (gestor). |
| Sin permiso de gestión | Se ve todo en solo-lectura; no aparecen los botones de gestión/verificación. |
| Error | `SectionError` por sección + "Reintentar". Errores de formulario inline. |
| Éxito | Toasts: "Causa guardada", "Acción agregada", "Acción marcada como hecha", "Evidencia registrada", "No conformidad cerrada" / "Reabierta para nuevas acciones". `router.refresh()` actualiza la ficha. |

## 7. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Button, Sheet, Textarea, Select, RadioGroup, EmptyState, SectionError | Reutilizados | |
| SignatureTimeline (patrón) | Reutilizado | para Trazabilidad |
| NcStatusBadge, NcSeverityBadge | Reutilizados de spec-no-conformidades | |
| NcStepper | Nuevo | 6 pasos |
| NcActionList, NcActionSheet, NcEvidenceForm, NcVerifyForm, NcCauseEditor | Nuevos | |

## 8. Decisiones y porqués

- **Página completa, no drawer:** la NC tiene más contenido y ciclo que un riesgo; merece URL propia compartible (como la ficha de documento) y se abre desde la tarea de la bandeja.
- **Stepper visible:** el valor del módulo es el ciclo CAPA; mostrarlo recuerda que falta verificar antes de cerrar.
- **Verificación bloqueada hasta terminar acciones:** refuerza en la UI la regla de ADR-008 (no cerrar sin verificar eficacia).
- **Evidencia inmutable:** mismo criterio que firmas y evidencias de control (valor probatorio de auditoría).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
