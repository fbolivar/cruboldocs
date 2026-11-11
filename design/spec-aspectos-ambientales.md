# Design Spec — Matriz de aspectos ambientales (`/app/aspectos-ambientales`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/ambiental/ARQUITECTURA.md + ADR-049/050.

## 1. Propósito y protagonista
- **Qué logra:** ver la **matriz de aspectos e impactos ambientales** con su **significancia**, y registrar/valorar nuevos (ISO 14001 6.1.2).
- **Protagonista:** la lista de aspectos con su **badge de significancia** (Significativo / No significativo).
- **Roles:** crear/editar/valorar/inactivar = Líder SIG o Líder del proceso (`can_manage_sig`); ver = roles del SIG (`can_see_sig`).

## 2. Wireframe (escritorio)
```
Aspectos ambientales (h1)                          [ Exportar CSV ] [+ Nuevo aspecto]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Aspectos  22 │ │ Significativos 6 │ │ Por revisar      2 │
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Condición ▾ ] [ Significancia ▾ ] [ Proceso ▾ ]  [ Buscar… ]   [ ☐ Mostrar inactivos ]

┌──────────────────────────────────────────────────────────────────────┐
│ ASP-2026-004  ◍ Normal      Vertimiento de aguas de lavado  ● Significativo │
│ Proceso Producción · Impacto: contaminación hídrica · Índice 11        │
├──────────────────────────────────────────────────────────────────────┤
│ ASP-2026-003  ◍ Emergencia  Derrame de químicos           ● Significativo │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + "Exportar CSV" y "+ Nuevo aspecto" (si gestiona).
- **Resumen** (3 StatCard): aspectos activos, **Significativos** (realce `error`), **por revisar** (próxima revisión vencida o ≤30 días, realce `advertencia`).
- **Filtros** (lado cliente): **Condición** (todas/normal/anormal/emergencia), **Significancia** (todas/significativo/no significativo), **Proceso**, **Buscar** (código/aspecto/impacto); toggle "Mostrar inactivos" (ocultos por defecto). "Limpiar filtros".
- **Lista** (cards/filas): código (`mono`), **chip de condición**, **aspecto** (protagonista), **badge de significancia**; segunda línea: proceso · "Impacto: …" · "Índice N". Orden: significativos primero, luego por código. Inactivos atenuados. Fila → ficha.

## 4. Sheet "Nuevo aspecto" (gestiona)
- **Actividad** (text, req), **Aspecto** (text, req), **Impacto** (text, req), **Condición** (Select normal/anormal/emergencia, req), **Proceso** (opc), **Controles** (textarea, opc), **Requisito legal** (Select de requisitos del Módulo v1.1-3, opc), **Responsable** (Select cargo, opc), **Próxima revisión** (date, opc).
- **Valoración** (4 Selects 1–3: Frecuencia, Severidad, Alcance, Cumplimiento legal) con el **índice y la significancia en vivo** (como GTC-45 en Peligros). Footer "Crear aspecto" → navega a la ficha.

## 5. Móvil (≤640px)
- Resumen apilado; filtros a ancho completo; cada aspecto como card; Sheet a pantalla completa; los 4 Selects de valoración apilados con el índice visible.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas. |
| Vacío | `EmptyState` (ícono hoja/planeta): "Aún no hay aspectos ambientales" + "Nuevo aspecto" (si gestiona). |
| Vacío por filtro | "Ningún aspecto coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/`router.refresh()`. |

## 7. Accesibilidad
- Significancia y condición **nunca por color solo** (badge/chip con texto). Selects con `label`; fila clicable `<Link>`.

## 8. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| **SignificanceBadge** | Nuevo | significativo→error, no_significativo→neutro |
| **ConditionChip** | Nuevo | normal/anormal/emergencia (emergencia resaltada) |
| **EnvScoreFields** | Nuevo | 4 Selects 1–3 + índice/significancia en vivo (coincide con el servidor) |
| EnvSummaryBar, EnvBoard, NewAspectSheet | Nuevo | espejo de los tableros previos |

## 9. Decisiones y porqués
- **Significativos como métrica protagonista** del resumen: es lo que el auditor y el plan ambiental priorizan.
- **Índice/significancia derivados en el servidor** (ADR-049): coherente con GTC-45; "en vivo" solo guía.
- **Enlace a requisito legal** (ADR-050): conecta el aspecto con su obligación.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
