# Metrología (7.1.5) y Gestión del cambio (6.3) — Arquitectura

> Entregable de la **fase de arquitectura** (feature #3 del roadmap v1.2: dos cierres rápidos de ISO
> 9001). Define alcance, modelo, rutas, integraciones y riesgos **antes** de escribir código.
> Fecha: 2026-11-11. **Pendiente de aprobación de Fernando (parada obligatoria de alcance).** No se
> escribe código ni migraciones en esta fase.

Decisiones de Fernando (2026-11-11): **dos módulos separados** (`/app/metrologia` y `/app/cambios`);
metrología = **equipo + historial de calibraciones + próxima fecha**; gestión del cambio = **flujo con
estados + análisis de impacto + aprobación por rol**.

---

# Módulo A — Metrología / Recursos de seguimiento y medición (ISO 9001 7.1.5)

## A.1 Negocio
- **Problema:** 9001 (7.1.5) exige que los equipos de **seguimiento y medición** estén identificados,
  **calibrados o verificados** a intervalos definidos, con trazabilidad a patrones, y que se conozca su
  estado. Es un hueco clásico que piden los auditores y que KAWAK sí cubre.
- **Acción de valor:** registrar el equipo, su frecuencia de calibración y su historial; el sistema
  deriva la **próxima fecha** y avisa cuando está por vencer.

## A.2 Modelo de dominio (multi-tenant, RLS por `organization_id`)
- **`measurement_equipment`**: `id`, `organization_id`, `code` (MET-AAAA-###), `name`, `type`
  (instrumento/patrón/software…), `process_id` (opc.), `location` (área/ubicación), `measurement_range`
  (texto), `unit` (texto), `calibration_frequency` (diaria/mensual/trimestral/semestral/anual/… reusa la
  escala de controles), `last_calibration_date`, `next_due_date` (**derivado en servidor**),
  `responsible_position_id` (opc.), `status` (vigente/vencido/fuera_de_servicio), `is_active` (baja lógica).
- **`calibration_events`** (historial): `id`, `organization_id`, `equipment_id`, `date`, `kind`
  (calibracion/verificacion), `result` (conforme/no_conforme/ajustado), `standard_used` (patrón, texto),
  `certificate_ref` (texto, p. ej. nº de certificado), `provider` (texto), `next_due_date`, `note`,
  `created_by`.
- **`metrology_counters`** (deny-all) para `MET-AAAA-###`.
- **Derivación en servidor:** al registrar una calibración, el RPC calcula `next_due_date = date +
  frecuencia` y actualiza `last_calibration_date`/`status` del equipo (espejo de controles/proveedores).
- **Adjuntos del certificado:** diferidos (solo referencia de texto), como en los módulos previos.

## A.3 Rutas
- **`/app/metrologia`** (tablero): resumen (equipos vigentes, **vencidos**, por vencer), lista con
  filtros (estado/proceso/buscar), **"Nuevo equipo"**. Ver = roles del SIG; gestionar = Líder SIG o Líder
  del proceso.
- **`/app/metrologia/[codigo]`** (ficha): datos del equipo + **historial de calibraciones** + registrar
  calibración + dar de baja. Próxima fecha con realce si vencida.

---

# Módulo B — Gestión del cambio (ISO 9001 6.3 — Planificación de los cambios)

## B.1 Negocio
- **Problema:** 6.3 exige que los cambios del SGC se hagan de forma **planificada**: propósito y
  consecuencias, integridad del sistema, recursos, y **responsabilidades**. El auditor espera un registro
  de cambios con su evaluación y aprobación.
- **Acción de valor:** registrar una solicitud de cambio, evaluar su impacto y aprobarla/rechazarla con
  trazabilidad.

## B.2 Modelo de dominio
- **`change_requests`**: `id`, `organization_id`, `code` (CMB-AAAA-###), `title`, `description`,
  `change_type` (proceso/documento/infraestructura/tecnologico/organizacional/otro), `process_id` (opc.),
  `request_date`, `requested_by_position_id` (opc.), **`impact_assessment`** (texto: riesgos, recursos,
  responsabilidades), `status` (propuesto/en_evaluacion/aprobado/rechazado/implementado),
  `approver_position_id` (opc.), `decision_date`, `implementation_notes`, `closed_at`, `created_by`.
- **`change_counters`** (deny-all) para `CMB-AAAA-###`.
- **Máquina de estados (flujo):** propuesto → en_evaluacion → (aprobado | rechazado); aprobado →
  implementado. Cada transición por RPC con autorización por rol; **aprobar/rechazar = Líder SIG**.
- **Enlace a riesgos:** diferido (un cambio podría generar/riesgo; se evaluará luego, coherente con los
  demás módulos).

## B.3 Rutas
- **`/app/cambios`** (tablero): resumen (por estado), lista con filtros (estado/tipo/proceso/buscar),
  **"Nueva solicitud"**. Ver = roles del SIG; gestionar/evaluar = Líder SIG o Líder del proceso.
- **`/app/cambios/[codigo]`** (ficha): encabezado + **stepper de estados** + análisis de impacto
  (editable en evaluación) + **decisión** (aprobar/rechazar, Líder SIG) + notas de implementación +
  trazabilidad.

---

## Alcance del MVP (ambos módulos)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Metrología: equipo + historial de calibraciones + próxima fecha derivada + recordatorio (cron) | **Sí** | Núcleo de 7.1.5; reusa el patrón de controles/proveedores. |
| Gestión del cambio: flujo con estados + análisis de impacto + aprobación por rol | **Sí** | Núcleo de 6.3; reusa el patrón de stepper (NC/PQRS). |
| Multi-norma (etiquetar equipos/cambios por norma) | **Sí (suave)** | Reusa `entity_norms`; bajo costo. |
| Adjuntos de certificados de calibración | **No** (diferido) | Sin bucket/columnas de archivo, como en módulos previos. |
| Enlace cambio → riesgo/NC | **No** (diferido) | Se evaluará en una fase siguiente. |
| Análisis de impacto estructurado (matriz) | **No** (texto en v1) | El texto cubre el requisito; estructurarlo es incremento. |

## Mapa de rutas (resumen) y roles
- `/app/metrologia` (+ ficha): ver = roles SIG; gestionar/calibrar = Líder SIG o Líder del proceso.
- `/app/cambios` (+ ficha): ver = roles SIG; gestionar/evaluar = Líder SIG o Líder del proceso;
  **aprobar/rechazar = Líder SIG**.

## Integraciones y riesgos (top 3)
- **Integraciones:** tareas+cron (recordatorio de calibración vencida, tarea `calibrar_equipo`/entity
  `equipo`); multi-norma (`entity_norms` + tipos `equipo`/`cambio`); auditoría `log_event`; CSV.
- **Riesgos y mitigación:**
  1. **Cálculo de próxima fecha** mal derivado → calcularlo **en el servidor** con la escala de
     frecuencias existente y **probarlo** (espejo de controles/proveedores, ya APTO).
  2. **Transiciones de estado** inválidas en cambios → máquina de estados con guardas en el RPC y
     pruebas (espejo de NC/PQRS).
  3. **Alcance creciente** (adjuntos, enlace a riesgos) → diferidos explícitamente; no bloquean el MVP.

## ADRs
- **ADR-056** — Metrología 7.1.5: equipos con **historial de calibraciones** y **próxima fecha derivada
  en servidor**; certificados como **referencia de texto** (adjuntos diferidos); recordatorio por cron.
- **ADR-057** — Gestión del cambio 6.3: **flujo con estados y aprobación por rol** (Líder SIG) +
  **análisis de impacto** (texto); enlace a riesgos **diferido**.

---

> Parada obligatoria: Fernando aprueba este alcance antes de pasar a diseño.
