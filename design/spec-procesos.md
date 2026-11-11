# Design Spec — Mapa de procesos (`/app/procesos`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 (Hex Core, solo modo claro) · **Arquitectura:** docs/procesos/ARQUITECTURA.md (v1.3-2) + ADR-063/064/065.

## 1. Propósito y protagonista
- **Qué logra:** ver el **mapa de procesos** de la organización agrupado por tipo y entrar a caracterizar cada uno.
- **Protagonista:** el **mapa** (los procesos agrupados por su rol en el sistema).
- **Roles:** ve = roles del SIG (`canSeeProcessMap`); caracteriza = Líder SIG o Líder del proceso (en la ficha).

## 2. Wireframe (escritorio)
```
Procesos (h1)                                           (el catálogo se gestiona en Administración →)
┌ Resumen ───────────────────────────────────────────────────────────┐
│ Procesos 10 · Caracterizados 6 · Sin caracterizar 4                 │
└────────────────────────────────────────────────────────────────────┘
[ Buscar… ]

ESTRATÉGICOS
┌───────────────────────────┐ ┌───────────────────────────┐
│ DE · Direccionamiento     │ │ SGC · Gestión de Calidad  │
│ Líder: Gerente   ✓ carac. │ │ Líder: Coord. Calidad     │
│ 3 ind · 2 riesgos         │ │ ◻ sin caracterizar        │
└───────────────────────────┘ └───────────────────────────┘
MISIONALES
┌───────────────────────────┐ …
APOYO
EVALUACIÓN
```

## 3. Secciones
- **Resumen** (3 `StatCard`): procesos totales, caracterizados, sin caracterizar.
- **Buscar** (cliente): por código o nombre.
- **Mapa por tipo:** cuatro bloques en orden **Estratégicos → Misionales → Apoyo → Evaluación**; cada uno con sus procesos en tarjetas (grid responsivo). La tarjeta muestra **código** (`mono`), **nombre** (protagonista), **líder**, un indicador **✓ caracterizado / ◻ sin caracterizar** (badge con texto), y conteos rápidos si están disponibles. Tarjeta clicable → ficha.
- **Nota:** el catálogo (crear/editar/borrar procesos) vive en Administración; aquí solo se caracteriza y se consulta. Enlace a `/app/admin`.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: resumen + bloques con tarjetas. |
| Vacío | `EmptyState` (ícono red/procesos): "Aún no hay procesos" + enlace a Administración para crearlos. |
| Vacío por búsqueda | "Ningún proceso coincide" + "Limpiar". |
| Bloque de tipo sin procesos | El bloque se oculta (no se muestra un tipo vacío). |

## 5. Accesibilidad
- Estado de caracterización nunca solo por color (badge con texto). Tarjeta es un `<Link>`; buscador con `label`.

## 6. Móvil (≤640px)
- Resumen apilado; cada bloque de tipo en **una columna** de tarjetas a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Input, EmptyState, StatCard | Reutilizados | |
| **ProcessMap** (bloques por tipo) + **ProcessCard** | Nuevo | mapa agrupado |
| **CharacterizedBadge** | Nuevo | ✓ caracterizado / ◻ sin caracterizar |

## 8. Decisiones
- **Agrupar por tipo** refleja el mapa de procesos clásico (estratégicos arriba, misionales al centro, apoyo y evaluación abajo).
- **Conteos y caracterización en la tarjeta** dan contexto sin entrar a la ficha.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
