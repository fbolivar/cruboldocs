# Design Spec — Ficha de salida no conforme (`/app/salidas-no-conformes/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/salidas-no-conformes/ARQUITECTURA.md (v1.3-5a) + ADR-073/074/075.

## 1. Propósito y protagonista
- **Qué logra:** controlar una salida no conforme: ver sus datos, **aplicar la disposición**, **cerrarla** y, si procede, **generar una NC**.
- **Protagonista:** la **disposición** (la decisión sobre la salida).
- **Roles:** gestiona = Líder SIG o Líder del proceso; el resto del SIG, solo lectura.

## 2. Wireframe (escritorio)
```
‹ Salidas no conformes
SNC-2026-003  Lote L-22 fuera de tolerancia     ◻ Abierta   [ Editar ] [ ⋯ ]
Producción · detectada 2026-11-10

( Abierta ●──── Tratada ────○ Cerrada )

DATOS
┌──────────────────────────────────────────────────────────────────────┐
│ Descripción · Identificación (lote L-22, 120 u.) · Proceso · Fecha    │
└──────────────────────────────────────────────────────────────────────┘

DISPOSICIÓN (8.7)
┌──────────────────────────────────────────────────────────────────────┐
│ Tipo: Reproceso · Detalle: … · ¿Informado al cliente? Sí              │
│ Responsable: Jefe de Producción            [ Aplicar disposición ]    │
└──────────────────────────────────────────────────────────────────────┘

NO CONFORMIDAD
[ Generar NC ]   (o)   → NC-2026-014

CIERRE
[ Cerrar salida ]  (exige disposición)
```

## 3. Secciones
- **Encabezado:** "‹ Salidas no conformes"; código, descripción, **badge de estado**, proceso, fecha; acciones **"Editar"** (datos, Sheet) y menú **⋯** (anular).
- **Stepper:** Abierta → Tratada → Cerrada.
- **Datos:** descripción, identificación, proceso, fecha de detección; editable en Sheet mientras no esté cerrada.
- **Disposición (8.7):** si aún no hay, botón **"Aplicar disposición"** (Sheet: **Tipo** —enum—, **Detalle**, **¿Informado/concesión del cliente?**, **Responsable** —cargo—). Al aplicar, estado → **Tratada** y se muestran los valores. Editable (reaplicar) mientras no esté cerrada.
- **No conformidad:** si no tiene NC y gestiona → **"Generar NC"** (confirma); si ya tiene → enlace **→ NC-code**.
- **Cierre:** **"Cerrar salida"** (confirma); **deshabilitado hasta que haya disposición**; estado → **Cerrada** (solo lectura).
- Modo solo lectura si no gestiona o está cerrada/anulada.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + secciones. |
| Sin disposición | La sección muestra "Aún sin disposición" + "Aplicar disposición" (si gestiona); "Cerrar" deshabilitado. |
| Cerrada / Anulada | Solo lectura; sin acciones de gestión. |
| Inexistente | `notFound()`. |
| Error / Éxito | `SectionError` + reintentar; toast + refresh. |

## 5. Accesibilidad
- Estado/disposición por badge/chip con texto; el stepper indica el paso actual con texto; campos del Sheet con `label`; "Cerrar" deshabilitado explica por qué (tooltip/caption "Aplica una disposición primero").

## 6. Móvil (≤640px)
- Una columna; stepper compacto; Sheets a pantalla completa; acciones a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Textarea, Input, Switch, EmptyState, SectionError, DropdownMenu, NcTimeline, Stepper | Reutilizados | |
| NcOutputStatusBadge, DispositionChip | Reutilizados (de la lista) | |
| **DispositionSheet** + **CloseOutputButton** + **GenerateNcButton** | Nuevo | aplicar disposición / cerrar / generar NC |

## 8. Decisiones
- **Cerrar exige disposición** (ADR-074): el registro no se cierra sin la decisión que 8.7 obliga a tomar.
- **Generar NC opcional** (ADR-075): la salida escala a 10.2 solo cuando procede, con trazabilidad visible (→ NC-code).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
