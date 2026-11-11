# Auditoría de seguridad — Metrología (7.1.5) y Gestión del cambio (6.3)

- **Fecha:** 2026-11-11
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migraciones `037_metrologia.sql` (tablas `measurement_equipment`/`calibration_events`/`metrology_counters`; RLS; `can_see_metrology`/`can_manage_metrology`; `metrology_next_due`; RPCs `create_equipment`/`update_equipment`/`set_equipment_service`/`register_calibration`/`equipment_or_fail`), `038_cambios.sql` (tabla `change_control` [nombre distinto de `change_requests`]/`change_control_counters`; RLS; `can_see_changes`/`can_manage_changes`; RPCs `create_change`/`update_change`/`assess_change`/`decide_change`/`implement_change`/`change_or_fail`), `039_recordatorio_calibracion.sql` (tasks `calibrar_equipo`/`equipo` + `run_daily_jobs`), capa de datos (`getMetrologySummary`/`listEquipment`/`getEquipment`; `getChangesSummary`/`listChanges`/`getChange`), acciones (`createEquipment`/`updateEquipment`/`setEquipmentService`/`registerCalibration`/`exportCalibrationsCsv`; `createChange`/`updateChange`/`assessChange`/`decideChange`/`implementChange`), `src/components/{metrologia,cambios}/*`, `src/app/app/{metrologia,cambios}/**`.

## Resumen ejecutivo (3 líneas)
Ambos módulos replican el patrón ya APTO: RLS solo-SELECT por `organization_id`, escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización por rol, FKs compuestas `(id, organization_id)`, numeración atómica (`MET-`/`CMB-AAAA-###`) y contadores deny-all. En metrología la **próxima fecha de calibración se deriva en el servidor** (fecha + frecuencia); en cambios la **máquina de estados** se valida en el RPC y **solo el Líder SIG aprueba/rechaza**. Sin dato personal sensible; certificados como referencia de texto (adjuntos diferidos). No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para desplegar.

## Hallazgos
| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Equipo/solicitud **sin proceso** lo gestiona cualquier Líder de proceso (semántica NULL-scope). Actor siempre rol SIG de la **misma** organización; sin cruce. | `can_manage_metrology`/`can_manage_changes` con `process` nulo. Patrón aceptado en todos los módulos. | Asignar proceso; o exigir Líder SIG. No bloquea. |

## Verificaciones (sin hallazgos)
- **Aislamiento/autorización:** `measurement_equipment`/`calibration_events`/`change_control` con RLS solo-SELECT (`can_see_*`); `metrology_counters`/`change_control_counters` deny-all. Toda escritura por RPC con `can_manage_*`. Verificado (RLS 037/038, 20 casos): consulta y otra org rechazadas; inserción por REST bloqueada; contadores deny-all. FKs compuestas `(id, organization_id)` en calibraciones, proceso, responsable, solicitante y aprobador → nada se liga a otra organización.
- **Próxima fecha server-side (ADR-056):** `register_calibration` deriva `next_due_date = fecha + frecuencia` y actualiza `last_calibration_date`/estado del equipo; verificado (anual → +1 año). El estado "vencido" se **deriva** en la vista por la fecha (no se confía del cliente).
- **Máquina de estados de cambios (ADR-057):** `assess_change` exige análisis de impacto y pasa a *en_evaluacion*; `decide_change` **solo Líder SIG** (verificado: responsable de control rechazado), solo desde *en_evaluacion* y con impacto; `implement_change` solo desde *aprobado*. Transiciones inválidas rechazadas.
- **Colisión de nombres:** la tabla se llamó `change_control` para no chocar con `change_requests` (solicitudes de actualización de documentos); verificado que son independientes.
- **Validación/dependencias:** zod (enums de frecuencia/tipo/resultado/estado, UUIDs, fechas, longitudes); `guard/ok/fail`; `dbMessage` oculta errores crudos; `exportCalibrationsCsv` con `toCsv` (anti-fórmula). Sin dependencias nuevas. Sin dato personal sensible (certificado/proveedor/patrón son texto de trazabilidad, no PII). Recordatorio por `run_daily_jobs` (`calibrar_equipo`, entity `equipo`), idempotente.

## Advisors de Supabase (security)
- `function_search_path_mutable` = **0**. `anon_security_definer_function_executable` sigue en **2** (solo las RPC públicas de la encuesta); las funciones de ambos módulos **no** son ejecutables por `anon`. `rls_enabled_no_policy` incluye ahora `metrology_counters` y `change_control_counters` (deny-all intencional).

## Condiciones
- Ninguna que bloquee el despliegue. **Ampliación:** adjuntos de certificados y enlace cambio→riesgo/NC, diferidos (ADR-056/057).
