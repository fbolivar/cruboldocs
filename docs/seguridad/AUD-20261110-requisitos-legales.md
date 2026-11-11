# Auditoría de seguridad — v1.1-3: Requisitos legales y evaluación de cumplimiento

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `030_requisitos_legales.sql` (tablas `legal_requirements`/`legal_evaluations`/`legal_counters`; RLS; helpers `can_see_legal`/`can_manage_legal`; RPCs `create_requirement`/`update_requirement`/`derogate_requirement`/`evaluate_requirement`/`legal_or_fail`; `tasks` +`evaluar_requisito`/`requisito_legal` y job diario), `src/lib/data/queries.ts` (`getLegalSummary`/`listLegalRequirements`/`getLegalRequirement`), `actions.ts` (`createRequirement`/`updateRequirement`/`derogateRequirement`/`evaluateRequirement`/`exportLegalCsv`), `src/components/requisitos-legales/*`, `src/app/app/requisitos-legales/**`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO de los módulos previos: RLS solo-SELECT por `organization_id`, escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización interna por rol y FKs compuestas que impiden el cruce entre organizaciones. El **cumplimiento vigente se deriva** de la última evaluación; la reevaluación se dispara server-side y por el job diario; no hay dato personal ni endpoint público nuevo. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Un requisito **sin proceso** lo gestiona/evalúa cualquier Líder de proceso (semántica NULL-scope de `has_role(org,'lider_proceso',null)`). Actor siempre rol SIG de la **misma** organización; sin cruce ni escalada. | `030` `can_manage_legal(org, process)` con `process` nulo. Mismo patrón NULL-scope de los módulos previos (APTO). | Asignar proceso a los requisitos; si se quisiera, exigir Líder SIG para los sin proceso. No bloquea el despliegue. |

## Verificaciones (sin hallazgos)

### Aislamiento y autorización
- RLS activo en las 3 tablas; las 2 de datos con **solo** política SELECT por `can_see_legal`; `legal_counters` deny-all. Toda escritura por RPC `SECURITY DEFINER` autorizado por `can_manage_legal(org, process)`. Verificado: Sofía (consulta) no crea; Beto (org B) no crea/evalúa ni ve requisitos de A; inserción directa por REST bloqueada por RLS en requisitos, evaluaciones y contador.
- FKs compuestas `(id, organization_id)` en requisito→proceso y evaluación→requisito; `legal_or_fail` resuelve por id (definer) + `is_active_member` → `P0002` genérico. `queries.ts` usa el cliente del usuario (RLS), sin admin/service_role.

### Integridad del flujo
- **Cumplimiento vigente derivado** de la última evaluación (ADR-041); sin evaluaciones → "No evaluado" (no se asume cumplimiento). La **evaluación exige evidencia** y un `compliance` válido (verificado: evidencia vacía y valor inválido rechazados). `evaluate_requirement` recalcula `next_eval_date` server-side según la frecuencia (verificado +12 meses anual).
- **Baja lógica** `derogado` (nunca DELETE, por el guard y para conservar historial): un requisito derogado **no** es editable ni evaluable (verificado). Numeración `REQ-AAAA-###` atómica por `legal_counters`.
- `run_daily_jobs` (service_role, idempotente) crea `evaluar_requisito` para requisitos vigentes con `next_eval_date` vencida asignada al líder del proceso; amplió los `check` de `tasks` conservando los valores previos.

### Validación / errores / dependencias
- Server actions con zod (enums de fuente/frecuencia/cumplimiento, longitudes, fecha de evaluación no futura); `guard/ok/fail`; `dbMessage` oculta errores crudos. `exportLegalCsv` con `toCsv` (anti-fórmula) sobre filas acotadas por RLS. Sin dependencias nuevas; sin dato personal (requisitos y su evaluación); `url` externa en la ficha con `rel="noopener noreferrer"`.

### Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) incluye ahora `legal_counters` (deny-all intencional).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs/helpers: patrón aceptado. **`anon_security_definer_function_executable` sigue en 2** (solo las RPC públicas de la encuesta); las funciones de este módulo **no** son ejecutables por `anon`. **Sin `function_search_path_mutable`**.

## Condiciones
- Ninguna que bloquee el despliegue. **Condiciones de ampliación:** requisito `parcial`/`no_cumple` → **NC** con un clic y **adjuntar** el PDF de la norma (Storage) quedan diferidos y se auditarán al implementarse; la **etiqueta por norma** llega con el v1.1-4.
