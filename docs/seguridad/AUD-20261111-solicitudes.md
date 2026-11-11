# Auditoría de seguridad — BPM-lite: Solicitudes y aprobaciones (v1.4-5)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 051 (`approval_flows`, `approval_requests`, `approval_request_steps`, `sol_counters`; helper `can_manage_flows`; RPCs `create_approval_flow`/`update_approval_flow`/`set_flow_steps`/`create_approval_request`/`decide_approval_step`/`cancel_approval_request`), capa de datos/acciones, UI (módulo Solicitudes + pestaña Flujos en Admin).

## Resumen ejecutivo (3 líneas)
Módulo independiente que no toca los flujos fijos ya auditados. Las cuatro tablas tienen RLS por `organization_id` (y `sol_counters` deny-all); toda escritura pasa por RPC `security definer` con `search_path=''` y autorización por rol: plantillas = Líder SIG/Admin, radicar = miembro activo, **decidir un paso exige que el cargo del usuario sea el del paso actual**, anular = solicitante o Líder SIG. Sin superficie `anon` ni datos personales. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| S-01 | Media | La redefinición del `check` de `tasks.type` (para añadir `aprobar_solicitud`) había omitido los tipos agregados por migraciones intermedias. | Detectado por las pruebas RLS (una NC no creaba su tarea); corregido re-declarando la lista **completa** (19 tipos + `aprobar_solicitud`) y re-aplicado a la base. | **Corregido** |
| S-02 | Info | `approval_requests`/pasos son visibles para cualquier miembro activo de la org. | RLS select `is_active_member`; decisión de diseño (ADR-094, patrón de Conocimiento). La acción sigue restringida por cargo. | Aceptado |
| S-03 | Bajo | Un aprobador que no corresponde podría intentar decidir. | `decide_approval_step` exige `my_position(org) = approver_position_id` del **paso actual**; estado/orden validados; no se salta ni re-decide un paso cerrado. | Mitigado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** RLS en las 4 tablas; `sol_counters` deny-all; FKs compuestas `(id, organization_id)`. Pruebas RLS 051: Beto (org B) no crea flujos ni ve solicitudes de A; nadie inserta flujos/counters por REST.
- **Autorización por acción:** plantillas → `can_manage_flows` (Líder SIG o Admin); Sofía (sin rol) y Beto rechazados. Radicar → miembro activo. Decidir → solo el cargo del paso actual (Carlos/gerencia y el solicitante rechazados en el paso 1). Anular → solicitante o Líder SIG (un tercero rechazado).
- **Integridad del flujo:** los pasos se **copian** a `approval_request_steps` al radicar; editar la plantilla no altera solicitudes en curso (verificado). Rechazar exige motivo y cierra; una solicitud cerrada no se vuelve a decidir; numeración atómica `SOL-AAAA-###`.
- **Validación de entrada:** `set_flow_steps` valida que cada paso tenga nombre y un cargo **de la organización** (cargo de otra org rechazado); zod en las server actions (uuid, longitudes, enums).
- **Tareas:** reusa `create_task`/`complete_tasks` (internas, revocadas de todos); el paso actual genera su tarea `aprobar_solicitud` y se completa al decidir; sin hard delete (todo por estado).
- **Sin anon ni PII:** ninguna función del módulo es `anon`-ejecutable; sin datos de clientes. `search_path=''` en todas; sin `function_search_path_mutable`.

## Conclusión
El módulo se puede desplegar. El único hallazgo con impacto (S-01) fue corregido y verificado por las pruebas. Los ítems Info/Bajo quedan aceptados o mitigados conforme a ADR-094/095/096.
