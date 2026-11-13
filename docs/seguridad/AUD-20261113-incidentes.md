# Auditoría de seguridad — Incidentes/accidentes SST (v1.6-2)

**Fecha:** 2026-11-13 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 058 (`incidents`, `inc_counters`; RPCs `report_incident`/`update_incident`/`set_incident_investigation`/`generate_nc_from_incident`/`close_incident`/`cancel_incident`/`incident_or_fail`; extensión de `nonconformities.source` con `incidente_sst`; extensión de `tasks` con `investigar_incidente`/`incidente` y `run_daily_jobs`), capa de datos (`getIncidentSummary`/`listIncidents`/`getIncident`), server actions (`reportIncident`/`updateIncident`/`setIncidentInvestigation`/`generateNcFromIncident`/`closeIncident`/`cancelIncident`/`exportIncidentsCsv`), UI (tablero `/app/incidentes` y ficha `/app/incidentes/[codigo]`), gates `canSeeIncidents`/`canManageIncidents` y nav.

## Resumen ejecutivo (3 líneas)
`incidents` tiene RLS por `organization_id` (solo-SELECT para roles SST vía `can_see_sst`) y FKs compuestas `(id, organization_id)` a procesos/cargos/peligros/NC; la escritura va solo por RPC `security definer` con `search_path=''`. **Reportar** está abierto a cualquier miembro activo (`is_active_member`, ADR-119); **gestionar/investigar/cerrar/anular** exige `can_manage_sst`. El dato de salud del trabajador (Ley 1581, sensible) se minimiza y queda tras el gate SST; la investigación se delega a una NC (`incidente_sst`) idempotente, reusando RCA/CAPA sin cruzar organización. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos (el Alto detectado fue corregido y reaplicado antes del deploy).

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| IC-01 | Alto | Al reescribir los `check` de `nonconformities.source` y `tasks.type`, la primera versión **omitió valores vigentes** (`indicador`, `aprobar_solicitud`), lo que habría roto en ejecución la generación de NC de indicadores y la creación de solicitudes. | Las pruebas RLS (que ejecutan esas RPC de otros módulos) fallaron con `*_check`. **Corregido:** constraints reescritos con la lista completa + el valor nuevo; **reaplicados a producción**. | Resuelto |
| IC-02 | Medio | Dato de **salud sensible** del trabajador (Ley 1581). | Minimización (nombre + cargo; documento opcional; sin diagnóstico clínico); RLS `can_see_sst` por `organization_id`; aviso en el formulario; CSV vía `toCsv`. | Mitigado |
| IC-03 | Info | Superficie `authenticated` crece con 6 RPC `security definer`. | Patrón del proyecto; `EXECUTE` revocado a `public`/`anon`; `search_path=''`. Esperado (ADR-118). | Aceptado |
| IC-04 | Bajo | Reportar abierto a cualquier miembro activo (ADR-119). | `report_incident` exige `is_active_member(org)`; no permite elegir otra org; gestionar/cerrar sigue restringido a SST. | Aceptado |
| IC-05 | Info | `inc_counters` sin política (deny-all). | Contador de numeración atómica; RLS activo sin policy = sin acceso por REST (por diseño). | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** `incidents` con RLS por `organization_id` y FKs compuestas `(id, org)` a `processes`/`positions`/`hazards`/`nonconformities`; `inc_counters` deny-all. Pruebas RLS 058: Beto (org B) no reporta ni ve incidentes de A, ni genera su NC; nadie inserta por REST; `inc_counters` deny-all; anon sin lectura.
- **Autorización por capas (ADR-119):** `report_incident` = `is_active_member` (Sofía/consulta puede reportar; Beto/otra org no); `update_incident`/`set_incident_investigation`/`generate_nc_from_incident`/`close_incident`/`cancel_incident` = `can_manage_sst` (Sofía rechazada). `incident_or_fail` no revela filas de otra org (RPC definer por id, autz posterior).
- **Integridad del flujo legal:** `report_incident` fija `investigation_due = occurred_at + 15` para accidentes (Res. 1401); `close_incident` exige investigación registrada y, para accidente, NC generada (no se cierra un accidente sin investigación); `cancel_incident` es baja lógica (sin hard delete).
- **Idempotencia / reuso:** `generate_nc_from_incident` con `for update`, solo si `nonconformity_id` nulo; segunda llamada rechazada; la NC nace con source `incidente_sst` en el org validado; severidad mapeada en servidor (mortal/grave→mayor, leve→menor, resto→observación). No hay tablas de RCA/acciones nuevas: la investigación reutiliza `rca_analyses` y `nc_actions`.
- **Dato sensible (Ley 1581):** columnas del trabajador mínimas; sin historia clínica; visibles solo a roles SST (RLS); aviso en el formulario; `exportIncidentsCsv` no incluye nombre/documento del trabajador (solo tipo/severidad/estado/proceso/lugar/fechas).
- **Validación / fuga:** enums (tipo/severidad), longitudes y cotas en zod; `dbMessage` no filtra nombres internos; `run_daily_jobs` sigue idempotente (`create_task` con `on conflict ... do nothing`) y no cruza org; el recordatorio `investigar_incidente` se asigna al investigador o al líder del proceso.
- **Advisors Supabase:** sin hallazgos nuevos para `incidents`/`inc_counters` (RLS activo, `search_path` fijo); solo las categorías ya aceptadas en módulos previos.

## Conclusión
El módulo se puede desplegar. El hallazgo Alto (IC-01, constraints reescritos con listas incompletas que habrían roto NC de indicadores y solicitudes) fue detectado por las pruebas RLS, corregido y **reaplicado a producción** antes del deploy. El dato de salud sensible queda minimizado y restringido por RLS a roles SST. No quedan Críticos ni Altos abiertos; los ítems restantes quedan aceptados o mitigados conforme a ADR-118/119/120.
