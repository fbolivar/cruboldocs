# Design Spec — Ficha de solicitud de cambio (`/app/cambios/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/metrologia-cambios/ARQUITECTURA.md + ADR-057.

## 1. Propósito y protagonista
- **Qué logra:** llevar una solicitud de cambio por su **flujo** (6.3): evaluar su impacto, aprobarla/rechazarla e implementarla.
- **Protagonista:** el **estado del cambio y su análisis de impacto**.
- **Roles:** ver = roles del SIG; evaluar (impacto) = Líder SIG o Líder del proceso; **aprobar/rechazar = Líder SIG**; implementar = Líder SIG o Líder del proceso.

## 2. Wireframe (escritorio)
```
‹ Gestión del cambio
CMB-2026-005  ⬒ Proceso   Cambio de proveedor de materia prima   ■ En evaluación   [ Editar ] [ ⋯ ]
Proceso Compras · Solicitado por Jefe de Compras · 2026-11-08

Propuesto ──●── En evaluación ──○── Aprobado ──○── Implementado          (Rechazado aparte)

ANÁLISIS DE IMPACTO                                            [ Evaluar ]
┌──────────────────────────────────────────────────────────────────────┐
│ Riesgos: … · Recursos: … · Responsabilidades: …                       │
└──────────────────────────────────────────────────────────────────────┘

DECISIÓN                                     [ Aprobar ] [ Rechazar ]  (Líder SIG)
IMPLEMENTACIÓN                               [ Marcar implementado ]
```

## 3. Secciones
- **Encabezado:** "‹ Gestión del cambio"; código, **chip de tipo**, título, **badge de estado**; proceso, solicitante, fecha; acciones **"Editar"** (datos, Sheet) y menú **⋯** según estado/rol.
- **Stepper** del flujo: propuesto → en evaluación → aprobado → implementado; **rechazado** aparte.
- **Análisis de impacto:** texto (riesgos, recursos, responsabilidades). **"Evaluar"** (Sheet) lo captura/edita y mueve a *en evaluación*. Requerido antes de aprobar.
- **Decisión:** **"Aprobar"/"Rechazar"** (solo **Líder SIG**, solo desde *en evaluación*); al aprobar/rechazar guarda aprobador y fecha de decisión.
- **Implementación:** **"Marcar implementado"** (desde *aprobado*) + notas de implementación.
- **Trazabilidad:** `NcTimeline` (creación, evaluación, decisión, implementación).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + stepper + secciones. |
| Sin impacto aún | La sección muestra "Sin análisis de impacto" + "Evaluar" (si gestiona). |
| Solo lectura | Implementado/rechazado o sin rol: sin acciones de gestión; se ve el flujo y el impacto. |
| Bloqueo de aprobación | "Aprobar" deshabilitado hasta que haya análisis de impacto y el estado sea *en evaluación*. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 5. Accesibilidad
- Estado/tipo nunca por color solo. Stepper con el paso actual anunciado; "Aprobar/Rechazar" confirman; acciones con `label`.

## 6. Móvil (≤640px)
- Encabezado apilado; stepper vertical/compacto; secciones a ancho completo; Sheets a pantalla completa.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Textarea, Select, EmptyState, SectionError, DropdownMenu, NcTimeline | Reutilizados | |
| ChangeStatusBadge, ChangeTypeChip | Reutilizados (del tablero) | |
| **ChangeStepper** | Nuevo | pasos del flujo (espejo de NcStepper) |
| **ImpactPanel** + **AssessChangeSheet** | Nuevo | análisis de impacto + captura |
| **ChangeDecisionActions** + **ImplementChangeAction** | Nuevo | aprobar/rechazar (Líder SIG) + implementar |

## 8. Decisiones y porqués
- **Aprobación bloqueada sin análisis de impacto:** 6.3 exige evaluar consecuencias y recursos antes de decidir.
- **Aprobar/rechazar solo Líder SIG:** la decisión del cambio recae en la dirección del SGC.
- **Stepper reutilizado:** coherencia con NC/PQRS; el usuario ya conoce el patrón.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
