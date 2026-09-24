# Design Spec — Inicio / Bandeja (`/app`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** saber qué tiene que hacer hoy y hacerlo con un clic.
- **Protagonista:** la **lista de tareas pendientes**, ordenada por vencimiento.
- **Acción primaria:** abrir la tarea (lleva a la ficha o al panel de riesgo con la acción ya enfocada).

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────┐
│ Buenos días, Laura (h1)                                          │
│ Coordinadora de Calidad · Acme SAS (small texto-sec)             │
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │⬡ 7       │ │⬡ 2       │ │⬡ 5       │ │⬡ 3       │  resumen     │
│ │Tareas    │ │Vencidas  │ │Docs por  │ │Controles │  (clicables) │
│ │pendientes│ │          │ │revisar30d│ │pendientes│              │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                  │
│ ┌─ Mis tareas ─────────────── [Todas|Documentos|Riesgos|Accesos]┐│
│ │ ● VENCIDA hace 2 días                                          ││
│ │ [Aprobar] PR-GC-003 Control de documentos v4        [Aprobar →]││
│ │   Asignada a: Gerente General · Solicitó: J. Pérez            ││
│ │ ● Vence hoy                                                    ││
│ │ [Revisar] FO-CO-012 Evaluación de proveedores v2   [Revisar →] ││
│ │ ● Vence en 5 días                                              ││
│ │ [Confirmar lectura] MA-SIG-001 Manual del SIG v7   [Leer →]    ││
│ │ [Ejecutar control] R-07 Verificación de backups    [Registrar]││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ Actividad reciente (secundario) ──────────────────────────────┐│
│ │ Ayer · Carlos R. aprobó IN-TI-004 v2 · …  (5 últimos)          ││
│ └────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

- **Saludo** (h1) + cargo y organización (`small`). Sin rango temporal: la bandeja es "ahora"; los resúmenes declaran su ventana en la etiqueta ("por revisar en 30 días").
- **Resumen** (4 cards, `superficie`, borde, padding 16, cifra `kpi`, ícono en hexágono `acento-suave`): Tareas pendientes, Vencidas (cifra en `error-texto` si > 0), Documentos por revisar (próximos 30 días), Controles pendientes (solo si el usuario tiene rol de riesgos; si no, se muestran 3). Cada card filtra la lista o lleva a la pantalla correspondiente. Sin variaciones ↑↓: no es un dashboard de tendencia.
- **Mis tareas** (card protagonista, ancho completo): filtros tipo segmented control (Todas / Documentos / Riesgos / Accesos) con conteo. Agrupadas por vencimiento: **Vencidas** (punto `error`), **Hoy** (punto `advertencia`), **Próximas** (sin punto). Cada fila: chip del tipo de tarea (`superficie-alt`, `label`), código en `mono` + título + versión, línea secundaria con cargo asignado y quién originó, botón a la derecha con el verbo específico (Aprobar, Revisar, Corregir, Atender solicitud, Leer, Registrar evidencia, Recertificar). Toda la fila es clicable; el botón es el foco visible. Paginación "Ver más" de 25 en 25.
- **Actividad reciente** (secundario, colapsable): 5 últimos eventos de `audit_log` visibles para el usuario.

## 3. Comportamiento móvil (≤640px)

- Resumen en grilla 2×2 con cifras de 24px.
- Filtros en scroll horizontal.
- Cada tarea es una card: chip de tipo + vencimiento arriba, código + título, botón full-width abajo (44px).
- Actividad reciente oculta tras "Ver actividad".

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 cards de resumen + 5 filas de tarea. |
| Vacío | Ícono de check en hexágono `exito-suave` + "Estás al día: no tienes tareas pendientes." + botón secundario "Ir a documentos". |
| Primer uso (Admin sin configuración) | Checklist de configuración en lugar del resumen: 1) Crear procesos, 2) Crear cargos y asignar roles, 3) Invitar usuarios — con progreso (x/3) y botón por paso a `/app/admin`. |
| Error | Por sección: si falla la lista, la card muestra "No pudimos cargar tus tareas." + "Reintentar"; el resumen sigue visible. |
| Éxito | Al volver de completar una tarea, toast "Tarea completada" y la fila desaparece con transición de 150 ms. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| SummaryCard | Nuevo | Ícono hexagonal, cifra, etiqueta, enlace |
| TaskList / TaskRow | Nuevo | Agrupada por vencimiento |
| TaskTypeChip | Nuevo | Mapa tipo → etiqueta |
| SegmentedFilter | Nuevo (Tabs de shadcn) | |
| SetupChecklist | Nuevo | Solo Admin con org vacía |
| ActivityFeed | Nuevo | Reutilizado en admin/auditoría |
| EmptyState | Nuevo (global) | Ícono en hexágono + mensaje + acción |

## 6. Decisiones y porqués

- Lista y no tablero kanban: las tareas son de un paso y el orden por vencimiento es lo que importa.
- Verbo específico por tarea: el usuario entiende qué hará antes de abrirla (criterio "día 1 solo con la bandeja").
- Sin gráficos en Inicio: los indicadores de 90 días son para después; aquí se actúa.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
