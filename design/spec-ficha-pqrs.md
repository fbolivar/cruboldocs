# Design Spec — Ficha de PQRS (`/app/pqrs/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pqrs/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** gestionar una PQRS desde su recepción hasta el **cierre** con la **respuesta** al cliente y su conformidad; y, si es un **reclamo**, generar la No Conformidad.
- **Protagonista:** el **estado** del caso y su **vencimiento** (el stepper + el realce de plazo).
- **Acciones según rol:** gestionar/responder/cerrar/anular/generar NC = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Wireframe textual (escritorio)

```
‹ PQRS
PQRS-2026-012  ◍ Reclamo              ■ En gestión      [ Editar ] [ Anular ]
Cliente: Juan Cliente · Proceso Comercial · Vence 2026-11-18 (en 3 días)

[ Recibida ]──[ En gestión ]──[ Resuelta ]──[ Cerrada ]        (stepper)

DATOS
Canal Correo · Recibida 2026-11-03 · Responsable: Coord. Servicio
Descripción: "El pedido llegó incompleto…"
Cliente (dato personal): Juan Cliente · juan@correo.co

GESTIÓN                                              [ Asignar / cambiar estado ]
RESPUESTA AL CLIENTE                                 [ Registrar respuesta ]
  (texto de la respuesta, o "Aún sin respuesta")

NO CONFORMIDAD (solo si reclamo)        [ Generar NC ]  ó  → NC-2026-00X
CIERRE                                               [ Cerrar PQRS ]
  Al cerrar: ¿el cliente quedó conforme? (sí/no). Requiere respuesta registrada.

TRAZABILIDAD
• 2026-11-03  Ana registró la PQRS …
```

## 3. Secciones

- **Encabezado:** "‹ PQRS"; **código** (`mono`), **chip de tipo**, **badge de estado**, cliente, proceso, **vencimiento** (realce `advertencia` si vencida/≤7 días); acciones **"Editar"** y **"Anular"** (en estados abiertos, si gestiona).
- **Stepper:** Recibida → En gestión → Resuelta → Cerrada; estado **Anulada** se muestra aparte (badge neutro), sin stepper activo.
- **Datos:** canal, fecha de recepción, responsable; **descripción**; bloque **cliente (dato personal)** con nombre y contacto. Se editan en el Sheet "Editar".
- **Gestión:** asignar responsable/proceso y cambiar estado (recibida↔en_gestion↔resuelta) vía Sheet/acciones; transiciones válidas según el estado.
- **Respuesta al cliente:** muestra la respuesta registrada o vacío; **"Registrar respuesta"** (textarea). **Requerida para cerrar.**
- **No conformidad** (solo si `type = reclamo`): botón **"Generar NC"** si no existe, o **enlace** a la NC (`NC-AAAA-###`) si ya se generó (idempotente, como hallazgo→NC).
- **Cierre:** **"Cerrar PQRS"** abre un Sheet que exige respuesta registrada y pregunta la **conformidad del cliente** (`satisfied` sí/no); al cerrar, estado → Cerrada.
- **Trazabilidad:** `NcTimeline` con los eventos de la PQRS (registro, cambios de estado, respuesta, NC generada, cierre).

## 4. Sheets

- **"Editar PQRS":** tipo, canal, cliente (nombre+contacto), proceso, descripción, fecha de recepción y **plazo** (`due_date`, editable). "Guardar cambios".
- **"Asignar / cambiar estado":** responsable (Select de cargos), proceso (Select), nuevo estado (transiciones válidas). "Guardar".
- **"Registrar respuesta":** textarea (req). Al guardar, el caso puede pasar a *resuelta*.
- **"Cerrar PQRS":** confirma que hay respuesta; **conformidad del cliente** (sí/no) + nota opcional. "Cerrar".
- **"Generar NC":** confirma y crea la NC (severidad por defecto `mayor` para un reclamo, editable), enlaza y navega/da el enlace.

## 5. Comportamiento móvil (≤640px)

- Encabezado apilado; acciones a ancho completo (botones apilados).
- Stepper horizontal con scroll o compacto (puntos + etiqueta del paso actual).
- Secciones una debajo de otra; Sheets a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + stepper + 3 secciones. |
| Vacío (sin respuesta / sin NC) | Respuesta: "Aún sin respuesta"; NC (si reclamo): botón "Generar NC". |
| Cerrada / Anulada | Solo lectura: sin botones de gestión; se ve la respuesta, la conformidad y la traza. |
| Solo lectura (no gestiona) | Sin acciones; ficha completa visible. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al guardar/cerrar/generar NC; `router.refresh()`. |

## 7. Accesibilidad

- Estado y tipo **nunca por color solo** (badge/chip con texto). Stepper con `aria-current` en el paso activo.
- El bloque de dato personal se anuncia como tal; campos con `label`.
- "Generar NC" y "Cerrar" confirman la acción (irreversibles o con efecto en otro módulo).

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| PqrsStatusBadge, PqrsTypeChip, ChannelChip | Nuevo (compartidos con spec-pqrs) | |
| PqrsStepper | Nuevo | Recibida→En gestión→Resuelta→Cerrada (patrón del stepper de NC/Auditorías/Revisión) |
| EditPqrsSheet, ManagePqrsSheet, RespondPqrsSheet, ClosePqrsSheet, GenerateNcButton | Nuevo | gestión/respuesta/cierre/NC |

## 9. Decisiones y porqués

- **El cierre exige respuesta registrada:** no se cierra una PQRS sin evidencia de que se le respondió al cliente (8.2).
- **Conformidad del cliente al cerrar** (`satisfied`): es el dato de percepción por caso; la métrica agregada vive en el panel de satisfacción (ADR-029).
- **Generar NC solo en reclamos** y una sola vez (idempotente), reutilizando el patrón ya probado; la NC sigue su ciclo CAPA en el Módulo 1.
- **Severidad por defecto `mayor`** para un reclamo (editable): un reclamo del cliente pesa; el usuario puede bajarla.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
