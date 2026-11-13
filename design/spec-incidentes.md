# Design Spec — Incidentes/accidentes SST

**Producto:** CrubolDocs · **Fecha:** 2026-11-13 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/incidentes/ARQUITECTURA.md (v1.6-2) + ADR-118/119/120.

## 1. Propósito y protagonista
- **Qué logra:** reportar una ocurrencia SST (accidente/incidente/casi-accidente), investigarla (causa raíz + acciones vía NC) y cerrarla.
- **Protagonistas:** en el tablero, **la lista de incidentes** (con los vencidos/accidentes arriba); en la ficha, **la investigación** (causa raíz + plan de acción de la NC).
- **Marco:** reusa el patrón de PQRS/Inspecciones (tablero con StatCards + ficha con secciones y stepper). La investigación profunda vive en la NC generada (RCA + nc_actions ya existentes).

## 2. `/app/incidentes` — tablero
- **Barra de resumen (3 StatCard):** Abiertos (estado reportado/en_investigacion) · Accidentes (periodo) · Investigaciones vencidas (accidentes con `investigation_due` pasada y sin cerrar; realce error).
- **Lista de incidentes:** código `INC-AAAA-###`, tipo (chip accidente/incidente/casi-accidente), severidad (badge), proceso/lugar, fecha de ocurrencia, estado (badge). **Orden:** vencidos y accidentes abiertos primero. Fila → ficha. Filtros del lado cliente: tipo, severidad, estado, proceso, buscar.
- **"Reportar incidente"** (Sheet, abierto a cualquier miembro activo): tipo; fecha/hora de ocurrencia; lugar; proceso (opc.); peligro asociado (Select de `hazards`, opc.); descripción; acción inmediata (opc.); severidad (sin lesión/leve/grave/mortal); **datos del trabajador** (aviso de dato sensible de salud) nombre + cargo (Select de cargos) + documento (opc.); lesión + parte del cuerpo + días perdidos (opc.). Guardar. Aviso: "Registra solo lo mínimo; no incluyas diagnósticos médicos".

## 3. `/app/incidentes/[codigo]` — ficha
- **Encabezado:** código, tipo (chip), severidad (badge), estado (badge), fecha/lugar; acciones **Editar / Anular** según estado y `canManageSst`.
- **Stepper:** Reportado → En investigación → Cerrado (Anulado aparte).
- **Datos del trabajador** (dato sensible, solo lectura minimizada): nombre, cargo, documento, lesión, parte del cuerpo, días perdidos. Visible a roles SST.
- **Ocurrencia:** descripción, acción inmediata, proceso, peligro asociado (enlace). Editable en Sheet si gestiona y no cerrado.
- **Investigación:** asignar **investigador** (cargo) y fecha de investigación (Sheet); plazo legal con realce si vencido (accidente, 15 días). Botón **"Generar NC"** (origen incidente SST) → una vez creada, se muestra el **enlace a la NC** con su estado, su **causa raíz (RCA)** y su **plan de acción** resumidos (hacer el 5 Porqués/Ishikawa y las acciones **dentro de la NC**, no se duplica aquí).
- **Cierre:** Sheet "Cerrar incidente" — exige investigación registrada; si es **accidente**, exige **NC generada**. Para casi-accidente/incidente puede cerrarse sin NC.
- **Trazabilidad:** `NcTimeline` (reportó, asignó investigación, generó NC, cerró/anuló).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de lista/ficha. |
| Vacío | Sin incidentes → EmptyState con "Reportar incidente". |
| Enviando | Botón cargando. |
| Éxito | Toast; el incidente aparece con su estado. |
| Vencido | Accidente con investigación vencida resaltado (error) en lista y ficha. |
| Solo lectura | Si no gestiona, o el incidente está cerrado/anulado (reportar sigue disponible para todos). |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 5. Badges / chips
- **Tipo:** accidente→error (resaltado), incidente→advertencia, casi_accidente→info.
- **Severidad:** sin_lesion→neutro, leve→info, grave→advertencia, mortal→error.
- **Estado:** reportado→info, en_investigacion→advertencia, cerrado→exito, anulado→neutro.

## 6. Accesibilidad / Móvil
- Campos con `label`; badges con texto, no solo color. Aviso de dato sensible visible junto a los campos del trabajador. En móvil: lista en tarjetas, Sheet a ancho completo, stepper vertical.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, SectionError, StatCard, NcTimeline | Reutilizados | |
| **IncidentsBoard** + **ReportIncidentSheet** | Nuevo | tablero + reportar |
| **IncidentStepper** | Nuevo | reportado→en investigación→cerrado |
| **IncidentInvestigation** | Nuevo | asignar investigador + enlace/estado de la NC (RCA + acciones) |
| **IncidentKindChip** / **SeverityBadge** / **IncidentStatusBadge** | Nuevo | tipo/severidad/estado |

## 8. Decisiones
- **Investigación en la NC** (ADR-118): la ficha enlaza a la NC; el 5 Porqués/Ishikawa y las acciones se hacen allí (reusa RCA + nc_actions).
- **Reportar abierto** (ADR-119): el Sheet de reporte es visible a todo miembro activo; investigar/cerrar exige SST.
- **Plazo legal con realce** (ADR-120): accidente muestra el vencimiento a 15 días y lo resalta si pasa.
- **Dato sensible minimizado:** sin diagnósticos; aviso junto a los campos; RLS roles SST.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
