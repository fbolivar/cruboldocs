# Design Spec — Solicitudes y aprobaciones (BPM-lite)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/bpm/ARQUITECTURA.md (v1.4-5) + ADR-094/095/096.

## 1. Propósito y protagonista
- **Qué logra:** radicar una solicitud y verla avanzar paso a paso hasta aprobarse/rechazarse; y configurar los flujos.
- **Protagonistas:** en la lista, **la bandeja de solicitudes**; en la ficha, **el stepper de aprobación**.
- **Marco:** reusa el patrón de PQRS/Proveedores (tablero con filtros del lado cliente + ficha de página completa con stepper), ya construido.

## 2. `/app/solicitudes` — tablero
- **Barra de resumen (3 StatCard):** Pendientes (status pendiente), Pendientes de **mi** aprobación (paso actual = mi cargo), Cerradas este periodo (aprobada/rechazada).
- **Lista:** código `SOL-AAAA-###`, título, flujo, estado (badge), paso actual (p. ej. "2/3 · Gerencia"), fecha. Fila clicable → ficha. Orden: pendientes de mi aprobación primero, luego pendientes, luego cerradas.
- **Filtros (cliente):** estado, flujo, "solo mis solicitudes", "solo pendientes de mí", buscar.
- **"Nueva solicitud"** (Sheet): selecciona **flujo activo**, título (req), descripción (req). Al crear → toast con el código y redirige a la ficha.
- **"Exportar CSV"** (stub→acción).
- Badges nuevos: **SolicitudStatusBadge** (pendiente→info, aprobada→exito, rechazada→error, anulada→neutro).

## 3. `/app/solicitudes/[codigo]` — ficha
- **Encabezado:** código (mono), SolicitudStatusBadge, nombre del flujo, solicitante, fecha; acción **Anular** (si eres solicitante o Líder SIG y está pendiente).
- **Datos:** título, descripción, flujo.
- **Stepper de aprobación** (vertical): un ítem por paso con nombre y **cargo aprobador**; estado por paso: ✓ aprobado (con quién y cuándo + comentario), ✗ rechazado, ● actual (resaltado), ○ pendiente. El paso rechazado corta el resto.
- **Acción del paso actual:** si tu cargo = aprobador del paso actual y la solicitud está pendiente → botones **Aprobar** / **Rechazar** (Sheet con comentario opcional en aprobar, **requerido** en rechazar).
- **Trazabilidad:** NcTimeline con los eventos (radicó, aprobó paso, rechazó, anuló).
- **Solo lectura** cuando no eres el aprobador del paso actual o la solicitud está cerrada.

## 4. `/app/admin` → pestaña "Flujos"
- Lista de **plantillas de flujo** (nombre, nº de pasos, activo/inactivo) + **"Nuevo flujo"**.
- **Editor de flujo** (Sheet/panel): nombre, descripción, **activo** (toggle); **pasos** como lista ordenable simple: por paso → nombre + **cargo aprobador** (Select de cargos). Agregar/quitar paso; el orden define la secuencia. Guardar reemplaza los pasos de la plantilla (no afecta solicitudes ya radicadas).
- Solo **Líder SIG / administrador de la organización**. Vacío: "Aún no hay flujos. Crea el primero."

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de lista/stepper. |
| Vacío | Lista sin solicitudes → EmptyState con "Nueva solicitud". Sin flujos activos → el Sheet avisa "Pide al Líder SIG que configure un flujo". |
| Enviando | Botón en loading. |
| Éxito | Toast; la ficha refleja el avance del paso. |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 6. Accesibilidad / Móvil
- Stepper legible con texto además de color (estado por etiqueta, no solo ícono/color). Campos con `label`. En móvil: lista en tarjetas, stepper vertical a ancho completo, botones a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, NcTimeline, StatCard | Reutilizados | |
| **SolicitudStatusBadge** | Nuevo | estado de la solicitud |
| **SolicitudesBoard** + **NewSolicitudSheet** | Nuevo | tablero + radicar |
| **ApprovalStepper** | Nuevo | pasos con decisión |
| **StepDecisionSheet** (Aprobar/Rechazar) | Nuevo | comentario |
| **FlowManager** (en Admin) | Nuevo | plantillas + editor de pasos |

## 8. Decisiones
- **Pasos copiados al radicar** (ADR-095): la ficha muestra la instancia, no la plantilla.
- **Acción solo para el cargo del paso actual**: el resto ve el stepper en solo lectura.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
