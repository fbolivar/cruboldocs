# Auditoría de seguridad — v1.1-4b: Aspectos e impactos ambientales (ISO 14001 6.1.2)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `032_ambiental.sql` (tablas `env_aspects`/`env_counters`; RLS; RPCs `create_aspect`/`update_aspect`/`set_aspect_active`/`env_aspect_or_fail`/`env_significance`; extensión de `entity_norms` [+`aspecto_ambiental`] y `tasks` [+`revisar_aspecto`/`aspecto_ambiental`]), capa de datos (`getEnvSummary`/`listEnvAspects`/`getEnvAspect`), acciones (`createAspect`/`updateAspect`/`setAspectActive`/`exportEnvCsv`), `src/components/ambiental/*`, `src/app/app/aspectos-ambientales/**`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO: RLS solo-SELECT por `organization_id`, escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización por rol y FKs compuestas (incl. el enlace a `legal_requirements`). La **significancia se calcula en el servidor** (índice de 4 criterios 1–3; ≥8 o emergencia o requisito legal); baja lógica `inactivo`; no hay dato personal ni endpoint público. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Aspecto **sin proceso** lo gestiona cualquier Líder de proceso (semántica NULL-scope). Actor siempre rol SIG de la **misma** organización; sin cruce. | `032` `can_manage_sig(org, process)` con `process` nulo. Patrón aceptado en todos los módulos. | Asignar proceso; si se quisiera, exigir Líder SIG para los sin proceso. No bloquea. |

## Verificaciones (sin hallazgos)
- **Aislamiento/autorización:** `env_aspects` con RLS solo-SELECT (`can_see_sig`); `env_counters` deny-all. Toda escritura por RPC `can_manage_sig(org, process)`. Verificado: Sofía (consulta) y Beto (org B) rechazados; inserción directa por REST bloqueada. FKs compuestas `(id, organization_id)` en proceso, **requisito legal** y responsable → no se liga a otra organización.
- **Significancia server-side (ADR-049):** índice = suma de 4 criterios (validados 1–3); significativo si ≥8 **o** condición=emergencia **o** hay requisito legal. Verificado: índice 11→significativo; índice 4 normal sin legal→no significativo; **emergencia con índice bajo→significativo**; criterio inválido (5) rechazado; editar recalcula. El cliente muestra el valor en vivo pero no lo persiste.
- **Ciclo de vida:** baja lógica `inactivo` → no editable (verificado). Numeración `ASP-AAAA-###` atómica (`env_counters`). `queries.ts` usa el cliente del usuario (RLS), sin admin/service_role; `exportEnvCsv` con `toCsv` (anti-fórmula).
- **Multi-norma/tasks:** `entity_norms` admite `aspecto_ambiental` (etiqueta 14001, reutiliza la capa del #4, misma RLS); `tasks` admite `revisar_aspecto`/`aspecto_ambiental` para la revisión futura, conservando los valores previos.
- **Validación/dependencias:** zod (enums de condición, criterios 1–3, longitudes, UUIDs); `guard/ok/fail`; `dbMessage` oculta errores crudos. Sin dependencias nuevas; sin dato personal (actividad/aspecto/impacto; `area`/responsable son cargo, no persona).

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) incluye ahora `env_counters` (deny-all intencional).
- `authenticated_security_definer_function_executable` (WARN): patrón aceptado. **`anon_security_definer_function_executable` sigue en 2** (solo las RPC públicas de la encuesta); las funciones de este módulo **no** son ejecutables por `anon`. **Sin `function_search_path_mutable`**.

## Condiciones
- Ninguna que bloquee el despliegue. **Ampliación:** aspecto significativo → objetivo/NC con un clic y el recordatorio de **revisión** por el job diario (los valores de `tasks` ya quedaron habilitados) se auditarán al implementarse; una matriz de criterios configurable sería el Constructor de formularios (#5).
