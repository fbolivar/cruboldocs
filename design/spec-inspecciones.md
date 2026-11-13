# Design Spec — Inspecciones / Control de calidad

**Producto:** CrubolDocs · **Fecha:** 2026-11-13 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/inspecciones/ARQUITECTURA.md (v1.6-1) + ADR-115/116/117.

## 1. Propósito y protagonista
- **Qué logra:** inspeccionar un lote/producto contra criterios y liberar (aceptar) o rechazar (→ NC/salida no conforme).
- **Protagonistas:** en el tablero, **la lista de inspecciones**; en la ficha, **los resultados por característica con su semáforo**.
- **Marco:** reusa el patrón de PQRS/Proveedores (tablero + ficha con secciones) y el editor por pasos de los flujos BPM para los planes.

## 2. `/app/inspecciones` — tablero
- **Barra de resumen (3 StatCard):** Pendientes (disposición pendiente), Rechazadas (periodo), % Aceptación (aceptadas / total con disposición).
- **Pestañas:** **Inspecciones** (lista) · **Planes** (plantillas; solo quien gestiona).
- **Lista de inspecciones:** código `INS-AAAA-###`, tipo (chip recepción/proceso/final), plan, proveedor/proceso, disposición (badge), fecha. Fila → ficha. Filtros: tipo, disposición, plan, proveedor, buscar.
- **"Nueva inspección"** (Sheet): tipo; plan (Select de planes activos); si recepción → proveedor; proceso (opc.); referencia de lote; **muestreo** (tamaño de lote, tamaño de muestra, nº de aceptación Ac, defectos); **resultados**: por cada característica del plan, un campo (numérico con su rango visible, o pasa/no pasa); disposición (aceptado/rechazado/concesión, con sugerencia según criterios). Guardar.
- **Pestaña Planes:** lista de planes (nombre, nº de características, activo) + **"Nuevo plan"**; editor de características (nombre, tipo numérico[min/max/unidad]/pasa-falla, agregar/quitar/ordenar).

## 3. `/app/inspecciones/[codigo]` — ficha
- **Encabezado:** código, tipo (chip), disposición (badge), plan, proveedor/proceso, fecha; acción **Editar** (si pendiente y gestiona).
- **Muestreo:** lote, tamaño de muestra, defectos, Ac/Re, con realce si defectos > Ac.
- **Resultados por característica:** tabla con característica, criterio (rango o "pasa"), valor/resultado, y **semáforo** cumple (verde) / no cumple (rojo).
- **Disposición y acciones:** si **rechazado** → botones **Generar NC** y **Generar salida no conforme** (o enlace al código ya generado). Si **aceptado/concesión** → sello de liberación.
- **Trazabilidad:** NcTimeline (creó, generó NC/salida).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de lista/ficha. |
| Vacío | Sin inspecciones → EmptyState con "Nueva inspección". Sin planes → "Crea un plan para empezar". |
| Enviando | Botón cargando. |
| Éxito | Toast; la inspección aparece con su disposición. |
| Rechazado | Resultados fuera de rango resaltados; acciones de NC/salida visibles. |
| Solo lectura | Si no gestiona o la inspección ya tiene disposición cerrada. |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 5. Badges / semáforo
- **Disposición:** pendiente→info, aceptado→exito, rechazado→error, concesión→advertencia.
- **Tipo:** recepción/proceso/final (chips).
- **Criterio por característica:** cumple→punto verde, no cumple→punto rojo (con texto, no solo color).

## 6. Accesibilidad / Móvil
- Campos con `label`; semáforos con texto. En móvil: lista en tarjetas, Sheet a ancho completo, tabla de resultados con scroll horizontal.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Table, EmptyState, NcTimeline, StatCard | Reutilizados | |
| **InspectionsBoard** + **NewInspectionSheet** | Nuevo | tablero + registrar (form desde el plan) |
| **InspectionPlanManager** (pestaña Planes) | Nuevo | plantillas + editor de características |
| **InspectionResultsTable** | Nuevo | resultados con semáforo |
| **DispositionBadge** / **InspectionTypeChip** | Nuevo | estado/tipo |

## 8. Decisiones
- **Resultados con semáforo** (ADR-115): el criterio por característica se ve de inmediato.
- **Rechazo accionable** (ADR-117): generar NC/salida desde la ficha.
- **Muestreo simple** (ADR-116): sin tablas AQL; la disposición la decide la persona.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
