# Design Spec — Ficha de aspecto ambiental (`/app/aspectos-ambientales/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/ambiental/ARQUITECTURA.md + ADR-049/050.

## 1. Propósito y protagonista
- **Qué logra:** consultar el aspecto, su **valoración de significancia** (índice GTC-45-like) y sus enlaces (control, requisito legal).
- **Protagonista:** el **badge de significancia** + el índice.
- **Roles:** editar/inactivar = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Wireframe (escritorio)
```
‹ Aspectos ambientales
ASP-2026-004  ◍ Normal        ● Significativo        [ Editar ] [ Inactivar ]
Vertimiento de aguas de lavado · Proceso Producción
Normas: 14001

VALORACIÓN (índice ambiental)
Frecuencia 3 · Severidad 3 · Alcance 2 · Cumplimiento legal 3 · Índice 11 → Significativo

DATOS
Actividad: Lavado de equipos · Impacto: contaminación del recurso hídrico
Controles: trampa de grasas; permiso de vertimiento
Requisito legal: REQ-2026-007 (↗) · Responsable: Coord. Ambiental · Próxima revisión 2027-01-10

TRAZABILIDAD
• 2026-06-01  Ana registró el aspecto …
```

## 3. Secciones
- **Encabezado:** "‹ Aspectos ambientales"; código (`mono`), **chip de condición**, **badge de significancia**, aspecto, proceso; `NormCell` (14001); acciones **Editar**/**Inactivar** (si gestiona y activo). Un aspecto **inactivo** → badge neutro "Inactivo", solo lectura.
- **Valoración:** los 4 criterios elegidos + **índice** y **significancia** derivados (con la regla: ≥8 o emergencia o requisito legal). Recalcula al editar.
- **Datos:** actividad, impacto, controles, **requisito legal** (enlace a su ficha, `rel="noopener"`), responsable, próxima revisión. Se editan en el Sheet "Editar".
- **Trazabilidad:** `NcTimeline`.

## 4. Sheets
- **"Editar aspecto":** actividad, aspecto, impacto, condición, proceso, controles, requisito legal, responsable, próxima revisión, y los **4 criterios** (con índice/significancia en vivo). "Guardar cambios" (solo activo).
- **"Inactivar":** confirma ("Deja de contar en la matriz activa; se conserva el histórico").

## 5. Móvil (≤640px)
- Encabezado apilado; secciones una debajo de otra; Sheet a pantalla completa.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + valoración + datos. |
| Inactivo / solo lectura | Sin acciones de edición; badge "Inactivo"; se ve la valoración y la traza. |
| Solo lectura (no gestiona) | Sin acciones. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 7. Accesibilidad
- Significancia/condición nunca por color solo (badge/chip con texto). Enlace al requisito con texto + ícono y `rel="noopener noreferrer"`. Campos con `label`; "Inactivar" confirma.

## 8. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| SignificanceBadge, ConditionChip, EnvScoreFields | Nuevo (compartidos con la matriz) | |
| NormCell | Reutilizado (multi-norma) | etiqueta 14001 |
| EditAspectSheet, InactivateAspectButton | Nuevo | edición / baja lógica |

## 9. Decisiones y porqués
- **Índice/significancia derivados en el servidor** (ADR-049); la ficha los muestra, no los teclea sueltos.
- **Enlace al requisito legal** (ADR-050) hace trazable aspecto↔obligación.
- **Inactivar = baja lógica:** conserva evidencia.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
