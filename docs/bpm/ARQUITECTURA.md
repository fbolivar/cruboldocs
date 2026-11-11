# Arquitectura — BPM-lite: Solicitudes y aprobaciones configurables (v1.4-5)

**Producto:** CrubolDocs · **Feature:** v1.4-5 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** cada organización tiene aprobaciones propias (compras, permisos, cambios, gastos) que hoy no caben en los flujos fijos de la app (documentos, NC). La competencia (SoftExpert, Pipefy) vende "workflows configurables".
- **Acción de valor:** el Líder SIG define **plantillas de flujo** (pasos de aprobación, cada uno a cargo de un cargo) y cualquier colaborador **radica una solicitud** que avanza paso a paso hasta aprobarse o rechazarse, con trazabilidad y tareas para cada aprobador.
- **Decisiones (Fernando):** (1) **módulo nuevo** de Solicitudes/Aprobaciones (no toca los flujos fijos ya auditados); (2) flujo **lineal secuencial**; (3) aprobador = **un cargo (posición) por paso**; (4) solicitud de **texto libre** + **tarea por paso** (reusa bandeja/cron).
- **Dato personal:** ninguno nuevo; la solicitud es de negocio interno (sin datos de clientes).

## 2. Modelo de dominio
Entidades (todas con RLS desde su creación, FKs compuestas `(id, organization_id)`, índice por `organization_id`):

- **`approval_flows`** — plantilla. `(id, organization_id, name, description, is_active bool default true, created_by, created_at, updated_at)`. Gestiona **Líder SIG**.
- **`approval_flow_steps`** — pasos de la plantilla. `(id, organization_id, flow_id→flows, step_no int, name, approver_position_id→positions)`. `unique(flow_id, step_no)`.
- **`approval_requests`** — instancia. `(id, organization_id, flow_id, code 'SOL-AAAA-###', title, description, requested_by, status in (pendiente,aprobada,rechazada,anulada) default pendiente, current_step int default 1, created_at, closed_at)`. Contador atómico `sol_counters` (deny-all).
- **`approval_request_steps`** — pasos **copiados** de la plantilla al radicar (así editar la plantilla no altera solicitudes en curso). `(id, organization_id, request_id, step_no, name, approver_position_id, decision in (pendiente,aprobada,rechazada) default pendiente, decided_by, decided_at, comment)`.
- **Tarea** `aprobar_solicitud` / entity_type `solicitud`: al volverse actual un paso, se crea la tarea para el cargo aprobador (reusa `tasks` + `run_daily_jobs`).

**Visibilidad:** `approval_requests` y sus pasos son visibles para cualquier **miembro activo** de la org (patrón de Conocimiento). Gestionar plantillas = Líder SIG; decidir un paso = quien tenga el cargo aprobador de ese paso; anular = el solicitante o el Líder SIG.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Plantillas de flujo (crear/editar/activar, pasos con cargo) | **Sí** | Núcleo configurable |
| Radicar solicitud (título + descripción) contra un flujo activo | **Sí** | Núcleo |
| Avance secuencial: aprobar paso → siguiente; rechazar → termina | **Sí** | Decisión de Fernando |
| Pasos copiados al radicar (inmutables ante edición de plantilla) | **Sí** | Integridad de lo en curso |
| Tarea `aprobar_solicitud` por paso actual (bandeja + cron) | **Sí** | Decisión de Fernando |
| Anular solicitud (solicitante o Líder SIG) mientras está pendiente | **Sí** | Cierre del ciclo |
| Exportar CSV de solicitudes | **Sí** | Coherencia con otros módulos |
| Ramas condicionales / reglas por monto | No | BPM completo; diferido |
| Aprobadores en paralelo / cuórum | No | Diferido |
| Payload con formulario del constructor / adjuntos | No | Diferido (texto libre en v1) |
| Flujos sobre entidades existentes (documentos, NC) | No | No se tocan los flujos fijos |
| SLA configurable por paso | No | La tarea usa un plazo simple (+15 días) |

**Camino dorado:** el Líder SIG crea el flujo "Aprobación de compra" con pasos *Jefe de área → Gerencia* → un colaborador radica **SOL-2026-001** (título + descripción) → al Jefe de área le llega la tarea *aprobar solicitud*; aprueba → pasa a Gerencia; Gerencia aprueba → la solicitud queda **aprobada**, con la línea de tiempo de cada decisión.

## 4. Mapa de rutas
- **`/app/solicitudes`** — lista (mis solicitudes + pendientes de mi aprobación + todas, con filtros estado/flujo/buscar) + botón **"Nueva solicitud"** (elige flujo activo, título, descripción). Visible a miembros activos.
- **`/app/solicitudes/[codigo]`** — ficha: encabezado (código, estado, flujo), **stepper** de pasos con su decisión/aprobador, acción **Aprobar/Rechazar** si eres el cargo del paso actual, **Anular** si eres el solicitante/Líder SIG, trazabilidad.
- **`/app/admin` → pestaña "Flujos"** — plantillas (crear/editar/activar, definir pasos con cargo). Solo Líder SIG / administrador de la organización.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (reusa cargos, tareas, cron, contador atómico, log_event, CSV).

**Top 3 riesgos y mitigación:**
1. **Editar una plantilla altera solicitudes en curso** → los pasos se **copian** a `approval_request_steps` al radicar; la instancia no depende de la plantilla.
2. **Aprobación por quien no corresponde** → `decide_step` exige que el cargo del usuario sea el `approver_position_id` del **paso actual**; estados y orden validados en el servidor (no se salta ni se re-decide un paso).
3. **Cargo aprobador vacante (nadie lo ocupa)** → la tarea se crea para el cargo; si no hay titular, queda pendiente y visible para el Líder SIG, que puede anular/reasignar editando el flujo para nuevas solicitudes (documentado; sin reasignación en caliente en v1).

## ADRs

### ADR-094 — Módulo independiente de Solicitudes (no toca los flujos fijos)
**Contexto:** los flujos de documentos/NC están auditados (APTO) y son sensibles.
**Decisión:** BPM-lite vive en un módulo nuevo (`approval_*`) con sus tablas, RLS y RPC; no modifica los flujos existentes.
**Consecuencias:** cero regresión en lo auditado; el motor configurable queda acotado a su dominio. Contra: no "configura" los flujos fijos (no es el objetivo de v1).

### ADR-095 — Flujo lineal secuencial con pasos copiados al radicar
**Contexto:** se necesita trazabilidad estable y evitar BPM completo.
**Decisión:** pasos en orden; cada paso aprueba o rechaza; al radicar se **copian** los pasos de la plantilla a la solicitud; avanzar es mover `current_step`; rechazar termina.
**Consecuencias:** simple, predecible y auditable; editar plantillas no afecta lo en curso. Contra: sin ramas ni paralelismo (diferido).

### ADR-096 — Aprobador por cargo + tarea por paso
**Contexto:** reusar el modelo organizacional y la bandeja.
**Decisión:** cada paso se asigna a un **cargo**; cualquier titular de ese cargo decide; el paso actual genera la tarea `aprobar_solicitud` (bandeja + cron), plazo simple +15 días.
**Consecuencias:** reusa cargos/tareas/cron sin lógica nueva de roles; coherente con los demás módulos. Contra: sin cuórum ni aprobador nominal (diferido).

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (lista + ficha con stepper + configuración de flujos en Admin). Luego backend, seguridad, deploy. Después #6 BI/constructor de informes.
