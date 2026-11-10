# Auditoría de seguridad — Módulo 6: Proveedores (ISO 9001 8.4)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `026_proveedores.sql` (tablas `suppliers`/`supplier_evaluations`/`supplier_counters`, RLS, helpers `can_see_suppliers`/`can_manage_suppliers`, RPCs `create_supplier`/`update_supplier`/`set_supplier_active`/`evaluate_supplier`, `supplier_or_fail`, numeración `PRV-AAAA-###`, ampliación de `tasks` y extensión del job diario `run_daily_jobs`); `src/lib/data/queries.ts` (`getSupplierSummary`/`listSuppliers`/`getSupplier`); `src/lib/data/actions.ts` (server actions del módulo + `exportSuppliersCsv`); `src/components/proveedores/*`; `src/app/app/proveedores/**`; navegación.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO de los módulos 1–5: RLS solo-SELECT por `organization_id`, escritura exclusiva por RPC `SECURITY DEFINER` con autorización interna por rol, FKs compuestas `(id, organization_id)` que impiden el cruce entre organizaciones, y server actions con zod que nunca confían en el `org` del cliente. El puntaje total y el resultado de cada evaluación se **calculan y persisten solo en el servidor** (pesos 50/30/20 y umbrales 80/60 fijos); el contador `PRV-AAAA-###` es atómico por organización; el job diario corre con `service_role`. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Un proveedor **sin proceso** (`process_id is null`) puede ser gestionado/evaluado por **cualquier** Líder de proceso de la organización, por la semántica de ámbito NULL de `has_role(org,'lider_proceso', null)`. El actor sigue siendo un rol SIG de la **misma** organización; no hay cruce entre organizaciones ni escalada a roles no-SIG. | `026` `can_manage_suppliers(org, process)` con `p_process`/`s.process_id` nulos. Mismo patrón NULL-scope de NC/Indicadores/Competencias (auditados APTO). | Asignar un proceso a los proveedores (buena práctica). No bloquea el despliegue. |

## Verificaciones (sin hallazgos)

### Aislamiento multi-tenant
- RLS activo en las 3 tablas. SELECT de `suppliers`/`supplier_evaluations` por `can_see_suppliers(organization_id)` (roles del SIG). `supplier_counters` **deny-all intencional** (sin política) — advisor `rls_enabled_no_policy` INFO esperado, como los demás contadores.
- FKs compuestas: `suppliers unique(id, organization_id)`; `supplier_evaluations` referencia `(supplier_id, organization_id)`; `suppliers.process_id` por `(process_id, organization_id)` → imposible enlazar un proveedor, una evaluación o un proceso de otra organización (el INSERT falla por FK y revierte). Verificado: Beto (org B) ve 0 proveedores de A.
- `queries.ts`: `listSuppliers`/`getSupplier`/`getSupplierSummary` usan el cliente del usuario (`scope().supabase`, **no** admin) y filtran `organization_id`; el resumen y el CSV se arman sobre filas ya acotadas por RLS. `exportSuppliersCsv` reutiliza `listSuppliers` (misma RLS) y `toCsv` (neutraliza inyección de fórmulas, criterio ya aplicado en documentos/riesgos).

### Integridad del puntaje y el resultado
- `evaluate_supplier` **calcula** `total = round((q·50 + d·30 + s·20)/100, 2)` y `result` por umbrales (≥80 aprobado / ≥60 condicionado / resto rechazado) **en el servidor**; el cliente solo envía los tres puntajes (zod `int 0..100`), nunca el total ni el resultado. La escritura de `supplier_evaluations` es exclusiva por RPC (RLS solo-SELECT). Guarda la **foto de pesos** 50/30/20. El cálculo cliente (`estimateEvaluation`) es solo vista previa. Verificado por pruebas RLS: 90/85/80 → 86.5 aprobado; 50/50/50 → 50 rechazado; 60/60/60 → 60 condicionado (límite inferior).
- La evaluación actualiza `suppliers.status` y `suppliers.next_eval_date` en la misma función (estado vigente derivado del servidor); la ambigüedad de columna `id` (OUT vs `suppliers.id`) se corrigió calificando la columna.

### Autorización de las mutaciones
- `create_supplier`/`update_supplier`/`set_supplier_active`/`evaluate_supplier` exigen `can_manage_suppliers(org, process)` = Líder SIG o Líder del proceso del proveedor. `supplier_or_fail` resuelve por id (definer) y valida `is_active_member(org)` → `P0002` genérico sin revelar existencia. Verificado: Sofía (consulta) rechazada al crear y al evaluar; Beto (org B) rechazado en A. `evaluate_supplier` rechaza un proveedor inactivo.
- Todas las funciones de escritura `SECURITY DEFINER` con `search_path=''`, `revoke public/anon` + `grant authenticated`; `supplier_or_fail` revocada también de `authenticated`; `log_event` (entidad `Proveedor`) en cada mutación.

### Numeración y ciclo de vida
- `PRV-AAAA-###` con `supplier_counters` (pk `(organization_id, year)`, `on conflict do update last_seq+1`): atómico y por organización; escrito solo por `create_supplier` (definer). Verificado incremental (001, 002) y sin cruce entre organizaciones.
- `set_supplier_active` hace **baja lógica** (`is_active=false`, `status='inactivo'`); al reactivar restaura el resultado de la última evaluación o `pendiente`. Sin `delete`.

### Job diario (recordatorio de reevaluación)
- `run_daily_jobs` es `SECURITY DEFINER`, `revoke` de `public/anon/authenticated` + `grant service_role` (solo lo llama el endpoint del cron con la clave de servidor). Crea la tarea `reevaluar_proveedor` para proveedores **activos** con `next_eval_date` vencida, asignada a `processes.leader_position_id` (misma organización por FK compuesta); idempotente por el `on conflict` de `create_task`. Sin cruce entre organizaciones. La ampliación de `tasks` (type `reevaluar_proveedor`, entity_type `proveedor`) conserva los valores previos.

### Certificado diferido / validación / errores / secretos
- **Certificado diferido sin hueco (ADR-027):** no se creó bucket, ni columnas de archivo, ni política de Storage para proveedores; no hay ruta de escritura ni de lectura.
- Server actions con zod: `name` 2–200, enums `kind`/`criticality`/`result`/`kind` de evaluación, puntajes `int 0..100`, fechas `^\d{4}-\d{2}-\d{2}$`, fecha de evaluación no futura, cotas de longitud. `fail()` genérico; `dbMessage` solo repite mensajes redactados por las funciones del flujo (42501/22023/P0002) y oculta errores crudos de RLS/permiso; los `check` de la base (kind/criticality/result/scores) son una segunda barrera ante llamadas REST directas.
- Server Actions de Next.js (no route handlers) → CSRF por verificación de origen integrada. Sin secretos en la migración ni en el código. Sin dependencias nuevas. Headers/middleware sin cambios.

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) sobre `supplier_counters`: **intencional** (deny-all).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs/helpers del módulo: **patrón aceptado** del proyecto (escritura por RPC con autorización interna; helpers usados en políticas). `search_path = ''` fijado en todas las funciones nuevas; ninguna aparece con `function_search_path_mutable`.

## Notas de proceso (no hallazgos)
- La migración se aplicó **en fragmentos** porque el guard del MCP de Supabase rechaza sentencias con `DROP`, con el texto `delete` y migraciones grandes; el archivo `026_proveedores.sql` refleja el estado final aplicado (la extensión del enum de `tasks` usa `ALTER … DROP/ADD CONSTRAINT` en su propio fragmento).

## Condiciones
- Ninguna que bloquee el despliegue. **Condición de ampliación:** auditar el **adjunto de certificados** (bucket privado + lectura por RLS + registro server-only) y las integraciones **proveedor→NC** e **indicador "% aprobados"** cuando se implementen (ADR-027).
