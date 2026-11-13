# Auditoría de seguridad — Inspecciones / control de calidad (v1.6-1)

**Fecha:** 2026-11-13 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 057 (`inspection_plans`, `inspections`, `inspection_results`, `ins_counters`; helpers `can_see_inspections`/`can_manage_inspections`; RPCs `create_inspection_plan`/`update_inspection_plan`/`create_inspection`/`generate_nc_from_inspection`/`generate_nc_output_from_inspection`), capa de datos (`listInspectionPlans`/`listActiveInspectionPlanOptions`/`getInspectionSummary`/`listInspections`/`getInspection`), server actions (`createInspectionPlan`/`updateInspectionPlan`/`createInspection`/`generateNcFromInspection`/`generateNcOutputFromInspection`/`exportInspectionsCsv`), UI (tablero `/app/inspecciones` con pestañas Inspecciones/Planes y ficha `/app/inspecciones/[codigo]`).

## Resumen ejecutivo (3 líneas)
Todas las tablas del módulo tienen RLS por `organization_id` (solo-SELECT para roles SIG vía `can_see_inspections`) y FKs compuestas `(id, organization_id)`; la escritura va solo por RPC `security definer` con `search_path=''` y autorización `can_manage_inspections(org, proceso)`. El servidor **copia** las características del plan al inspeccionar y calcula `ok` (no confía en el cliente); el rechazo genera NC (`producto_servicio`) o salida no conforme de forma idempotente, reusando los flujos existentes sin cruzar organización. No hay dato personal (datos técnicos de producto/lote). **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| IN-01 | Alto | Ambigüedad de columna `code` en las funciones que generan NC/salida (fallaría en ejecución). | `select code into v_code from public.nonconformities ...` chocaba con la columna de salida `returns table (code)` (errcode 42702). **Corregido** calificando `n.code`/`o.code`; reaplicado a producción. | Resuelto |
| IN-02 | Info | La superficie `authenticated` crece con 5 RPC `security definer`. | Patrón del proyecto (escritura por RPC con autz interna); `EXECUTE` revocado a `public`/`anon`. Esperado (ADR-115..117). | Aceptado |
| IN-03 | Bajo | Confianza en los resultados enviados por el cliente. | `create_inspection` **ignora** criterios del cliente: lee las características del propio plan, recalcula `ok` (valor en `[min,max]` o `passed`) en el servidor; zod valida tipos/longitudes en la server action. | Mitigado |
| IN-04 | Info | `ins_counters` sin política (deny-all). | Contador de numeración atómica; RLS activo sin policy = nadie accede por REST (por diseño). | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** `inspection_plans`/`inspections`/`inspection_results` con RLS por `organization_id` y FKs compuestas a `inspection_plans`, `suppliers`, `nonconformities`, `nonconforming_outputs`; `ins_counters` deny-all. Pruebas RLS 057: Beto (org B) no crea planes ni ve/registra inspecciones de A; nadie inserta por REST; `ins_counters` deny-all.
- **Autorización de gestión:** `create_inspection_plan`/`update_inspection_plan`/`create_inspection` exigen `can_manage_inspections(org, proceso)` (Líder SIG o Líder del proceso); la consulta (Sofía) y otra org son rechazadas. `generate_nc_from_inspection`/`generate_nc_output_from_inspection` revalidan la autz con el `process_id` de la inspección.
- **Integridad de resultados:** el servidor copia las características del plan activo y calcula `ok`; verificado que valores en rango → `ok=true` y fuera de rango → `ok=false`; la disposición la fija la persona (ADR-116).
- **Idempotencia del rechazo:** `generate_nc_*` operan con `for update`, solo si `disposition='rechazado'` y el enlace está nulo; segunda llamada rechazada; una inspección aceptada no genera NC; la NC nace con source `producto_servicio` en el org validado.
- **Validación / fuga:** longitudes, enums (tipo/disposición/tipo de característica) y cotas numéricas en zod; `exportInspectionsCsv` usa `toCsv` (anti-fórmula); `dbMessage` no filtra nombres internos; `search_path=''` en todas, sin `function_search_path_mutable`.
- **Advisors Supabase:** solo las 3 categorías esperadas y aceptadas en todos los módulos previos (`rls_enabled_no_policy` del contador, `*_security_definer_function_executable`); sin Críticos ni Altos nuevos.

## Conclusión
El módulo se puede desplegar. El único hallazgo Alto (IN-01, ambigüedad latente que habría roto la generación de NC/salida en ejecución) fue corregido en la migración y reaplicado a producción. No quedan Críticos ni Altos abiertos; los ítems Info/Bajo quedan aceptados o mitigados conforme a ADR-115/116/117.
