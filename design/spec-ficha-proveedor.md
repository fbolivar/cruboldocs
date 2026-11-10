# Design Spec — Ficha de Proveedor (`/app/proveedores/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/proveedores/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver el **estado vigente** de un proveedor (puntaje y resultado de su última evaluación), su **historial**, y **evaluar/reevaluar**.
- **Protagonista:** el **estado vigente** (badge + puntaje de la última evaluación).
- **Acciones según rol:** evaluar/editar/baja = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Wireframe textual (escritorio)

```
‹ Proveedores
PRV-2026-004  Transportes del Valle S.A.S.        ■ Aprobado   [ Editar ] [ Dar de baja ]
Servicio · Crítico alto · Proceso Logística

ESTADO VIGENTE
┌───────────────────────────────────────────────┐
│ Puntaje  86/100  ███████████████████░░  Aprobado │   (medidor por umbral)
│ Última evaluación 2026-03-01 · Reevaluar 2027-03-01 │
│                                   [ Evaluar / Reevaluar ] │
└───────────────────────────────────────────────┘

DATOS
NIT 900.555.444-3 · Categoría Logística · Contacto: Ana Ruiz · ana@valle.co · 3105550000

HISTORIAL DE EVALUACIONES
┌──────────┬───────────┬───────┬───────┬─────────┬───────┬─────────────┐
│ Fecha    │ Tipo      │ Calid.│ Entr. │ Servicio│ Total │ Resultado   │
├──────────┼───────────┼───────┼───────┼─────────┼───────┼─────────────┤
│ 2026-03-01│ Periódica │ 90    │ 85    │ 80      │ 86.5  │ ■ Aprobado  │
│ 2025-03-01│ Inicial   │ 70    │ 60    │ 65      │ 66.5  │ ■ Condicion.│
└──────────┴───────────┴───────┴───────┴─────────┴───────┴─────────────┘

TRAZABILIDAD
• 2026-03-01  Juan evaluó al proveedor: Aprobado (86.5) …
```

## 3. Secciones

- **Encabezado:** "‹ Proveedores"; **código** (`mono`), **nombre** (h1), **badge de estado**, chips de criticidad y tipo, proceso (`texto-sec`); acciones **"Editar"** (Sheet) y **"Dar de baja"/"Reactivar"** (según `is_active`), solo si gestiona.
- **Estado vigente:** `Card` con el **medidor de puntaje** (barra 0–100 coloreada por umbral) de la última evaluación, el resultado (badge), fecha de la última evaluación y **próxima reevaluación** (realce `advertencia` si vencida/próxima); botón **"Evaluar / Reevaluar"** (si gestiona). Si no hay evaluaciones: estado *Pendiente* y CTA "Hacer evaluación inicial".
- **Datos:** NIT, categoría, contacto (nombre/correo/teléfono); se editan en el Sheet "Editar".
- **Historial de evaluaciones:** tabla (fecha, tipo, los 3 criterios, total, resultado badge); más reciente primero. Vacío: `EmptyState` "Sin evaluaciones; haz la evaluación inicial".
- **Trazabilidad:** `NcTimeline` con los eventos del proveedor (alta, evaluaciones, baja/reactivación).

## 4. Sheet "Evaluar / Reevaluar" (gestiona)

Campos:
- **Tipo** (Select: inicial / periódica; por defecto *inicial* si no hay evaluaciones, si no *periódica*).
- **Fecha de evaluación** (date, req; no futura).
- **Calidad**, **Cumplimiento/entrega**, **Servicio/precio**: cada uno input numérico 0–100 (o slider). Los **pesos (50/30/20) se muestran** junto a cada criterio.
- Bloque **resultado estimado en vivo**: `total = round(Σ score·peso/Σ peso, 2)` y **resultado** por umbral (≥80 Aprobado / 60–79 Condicionado / <60 Rechazado), con el badge correspondiente. (Es vista previa; el valor real lo calcula el servidor.)
- **Próxima reevaluación** (date; por defecto +12 meses, editable).
- **Nota** (textarea, opcional).

Footer: **"Guardar evaluación"** (loading) → toast "Evaluación guardada: `resultado`.", cierra, `router.refresh()` (el encabezado y el estado vigente se actualizan).

## 5. Sheet "Editar proveedor" (gestiona)

Mismos campos que "Nuevo proveedor" salvo el código (fijo): razón social, NIT, tipo, categoría, criticidad, proceso, contacto. "Guardar cambios".

## 6. Comportamiento móvil (≤640px)

- Encabezado apilado; acciones a ancho completo (menú o botones apilados).
- Estado vigente: medidor a ancho completo; botón "Evaluar / Reevaluar" debajo.
- Historial: la tabla se vuelve lista de cards (fecha + resultado arriba; criterios y total en dos líneas).
- Sheets a pantalla completa; en el de evaluación, los 3 criterios apilados con el resultado estimado fijo al pie.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + card de estado + 3 filas de historial. |
| Vacío (sin evaluaciones) | Estado *Pendiente*; card de estado con CTA "Hacer evaluación inicial"; historial con `EmptyState`. |
| Inactivo (dado de baja) | Badge *Inactivo*; sin botón de evaluar; acción "Reactivar" disponible. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al evaluar/editar; `router.refresh()`. |

## 8. Accesibilidad

- El medidor de puntaje no comunica solo por color: muestra el número (`86/100`) y el resultado en texto; `aria-label` "Puntaje 86 de 100, Aprobado".
- Resultado y estado nunca por color solo (badge con texto). Tabla con encabezados (`<th scope>`). Campos con `label`; los pesos se asocian a su criterio con `aria-describedby`.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| SupplierStatusBadge, CriticalityChip, SupplierKindChip | Nuevo (compartidos con spec-proveedores) | |
| ScoreMeter | Nuevo | barra 0–100 coloreada por umbral (éxito ≥80 / advertencia 60–79 / error <60) + número |
| EvaluationHistory | Nuevo | tabla escritorio ↔ lista de cards en móvil |
| EvaluateSupplierSheet | Nuevo | 3 criterios + total/result estimado en vivo (helper `estimateEvaluation`, espejo del servidor) |
| EditSupplierSheet / NewSupplierSheet | Nuevo | alta/edición comparten el formulario de datos |

## 10. Decisiones y porqués

- **Resultado estimado en vivo** en el Sheet (igual que el cumplimiento estimado de Indicadores y el estado derivado de Competencias): el usuario ve de inmediato si el proveedor queda aprobado/condicionado/rechazado; el valor persistido lo decide el servidor.
- **Pesos visibles** junto a cada criterio: transparencia de cómo se pondera (y por qué un 90 en calidad pesa más que en servicio).
- **Medidor por umbral** como protagonista de la ficha: traduce el puntaje a la decisión de 8.4 de un vistazo.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
