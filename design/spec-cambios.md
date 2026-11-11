# Design Spec — Gestión del cambio: tablero (`/app/cambios`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/metrologia-cambios/ARQUITECTURA.md + ADR-057.

## 1. Propósito y protagonista
- **Qué logra:** ver las **solicitudes de cambio** del SGC por estado, y crear una nueva.
- **Protagonista:** la **lista de solicitudes** con su estado del flujo (6.3).
- **Roles:** ver = roles del SIG; crear/evaluar = Líder SIG o Líder del proceso; **aprobar/rechazar = Líder SIG**.

## 2. Wireframe (escritorio)
```
Gestión del cambio (h1)                                       [+ Nueva solicitud]
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Propuestas  3│ │ En evaluación 2│ │ Aprobados  4│ │ Implementados 9│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
[ Estado ▾ ] [ Tipo ▾ ] [ Proceso ▾ ] [ Buscar… ]

┌──────────────────────────────────────────────────────────────────────┐
│ CMB-2026-005  ⬒ Proceso   Cambio de proveedor de materia prima        │
│ Proceso Compras · Solicitado 2026-11-08            ■ En evaluación     │  [ Abrir ]
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + **"+ Nueva solicitud"** (si gestiona).
- **Resumen** (4 `StatCard`): propuestas, en evaluación, aprobados, implementados.
- **Filtros** (cliente): **Estado**, **Tipo** (proceso/documento/infraestructura/tecnológico/organizacional/otro), **Proceso**, **Buscar**.
- **Lista** (cards/filas): **código** (`mono`), **chip de tipo**, **título** (protagonista), **badge de estado**; segunda línea: proceso · "Solicitado fecha". Fila clicable → ficha.
- **Sheet "Nueva solicitud":** título, tipo (Select), proceso (opc.), descripción, solicitante (cargo, opc.). Footer "Crear" → `CMB-AAAA-###` en **propuesto**.

## 4. Componentes nuevos
| Componente | Notas |
|---|---|
| **ChangeStatusBadge** | propuesto→neutro, en_evaluacion→advertencia, aprobado→info/acento, implementado→exito, rechazado→error. |
| **ChangeTypeChip** | tipo del cambio. |
| ChangesSummaryBar, ChangesBoard, NewChangeSheet | espejo de los tableros previos. |

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 tarjetas + filas. |
| Vacío | `EmptyState`: "Aún no hay solicitudes de cambio" + "Crear la primera" (si gestiona). |
| Vacío por filtro | "Ninguna solicitud coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Accesibilidad
- Estado/tipo nunca por color solo (badge/chip con texto). Filtros con `label`; fila `<Link>`.

## 7. Móvil (≤640px)
- Resumen apilado; solicitudes como cards; acción primaria a ancho completo. Sheet a pantalla completa.

## 8. Decisiones y porqués
- **Resumen por estado:** el valor de 6.3 es ver qué cambios están pendientes de evaluar/aprobar.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
