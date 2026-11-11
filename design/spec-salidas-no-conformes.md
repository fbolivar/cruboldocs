# Design Spec — Salidas no conformes: tablero (`/app/salidas-no-conformes`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/salidas-no-conformes/ARQUITECTURA.md (v1.3-5a) + ADR-073/074/075.

## 1. Propósito y protagonista
- **Qué logra:** ver las **salidas no conformes** (8.7), registrar una nueva y entrar a su ficha.
- **Protagonista:** la **lista** con su estado (Abierta / Tratada / Cerrada).
- **Roles:** ve = roles del SIG (`canSeeNcOutputs`); gestiona = Líder SIG o Líder del proceso.

## 2. Wireframe (escritorio)
```
Salidas no conformes (h1)                              [+ Nueva salida]
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Abiertas 3│ │ Tratadas 2│ │ Cerradas 9│
└───────────┘ └───────────┘ └───────────┘
[ Estado ▾ ] [ Disposición ▾ ] [ Proceso ▾ ] [ Buscar… ]      [ Exportar CSV ]

┌──────────────────────────────────────────────────────────────────────┐
│ SNC-2026-003  Lote L-22 fuera de tolerancia   ◻ Abierta               │
│ Producción · detectada 2026-11-10                         [ ⋯ ]       │
├──────────────────────────────────────────────────────────────────────┤
│ SNC-2026-002  Servicio reprogramado           ■ Cerrada · Reproceso   │
│ Operaciones · → NC-2026-014                               [ ⋯ ]       │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Resumen** (3 `StatCard`): abiertas, tratadas, cerradas.
- **Filtros** (cliente): Estado, **Disposición**, Proceso, Buscar (código/descripción).
- **Lista** (filas): **código** (`mono`), **descripción** (protagonista), **badge de estado** (abierta→advertencia, tratada→info, cerrada→éxito); segunda línea `texto-sec`: proceso · fecha de detección · disposición (si existe) · enlace **→ NC-code** si generó NC. Fila clicable → ficha. Menú **⋯** (ver, generar NC, anular). Anuladas atenuadas y ocultas por defecto (toggle).
- **Sheet "Nueva salida":** **Descripción** (req), **Proceso** (opc.), **Fecha de detección** (def. hoy), **Identificación** (lote/cantidad/referencia, opc.). Footer "Crear" → `SNC-AAAA-###` abierta y navega a la ficha.
- **Exportar CSV.**

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + filas. |
| Vacío | `EmptyState` (ícono paquete): "Sin salidas no conformes" + "Registrar la primera" (si gestiona). |
| Vacío por filtro | "Nada coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/refresh. |

## 5. Accesibilidad
- Estado/disposición por `Badge`/`Chip` con texto (no solo color); filtros con `label`; fila como `<Link>`; menú ⋯ accesible por teclado.

## 6. Móvil (≤640px)
- Resumen apilado; filas como cards; acción primaria a ancho completo; Sheet a pantalla completa.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, SectionError, DropdownMenu | Reutilizados | |
| **NcOutputStatusBadge** + **DispositionChip** | Nuevo | estado / tipo de disposición |
| NcOutputsSummaryBar, NcOutputsBoard, NewNcOutputSheet, NcOutputRowMenu | Nuevo | espejo de PQRS/NC |

## 8. Decisiones
- **Lista con estado y disposición visibles:** 8.7 se audita por la decisión tomada; verla en la fila ahorra abrir la ficha.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
