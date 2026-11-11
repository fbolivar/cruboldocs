# Auditoría de seguridad — v1.1-4: Multi-norma y peligros SST (GTC-45)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `031_multinorma.sql` (tablas `norms`/`entity_norms`/`hazards`/`hazard_counters`; RLS; helpers `can_see_sig`/`can_manage_sig`; RPCs `upsert_norm`/`set_norm_active`/`set_entity_norms`/`create_hazard`/`update_hazard`/`set_hazard_active`/`gtc45_level`/`hazard_or_fail`), capa de datos (`listNorms`/`listActiveNorms`/`getEntityNorms`/`listEntityNormsFor`/`getHazardsSummary`/`listHazards`/`getHazard`), acciones (`upsertNorm`/`setNormActive`/`setEntityNorms`/`createHazard`/`updateHazard`/`setHazardActive`/`exportHazardsCsv`), `src/components/peligros/*`, `src/components/multinorma/*`, `src/components/admin/normas-tab.tsx`/`norms-manager.tsx`, `src/app/app/peligros/**`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO: RLS solo-SELECT por `organization_id`, escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización por rol y FKs compuestas. La **valoración GTC-45** (NP/NR/Nivel) se calcula **en el servidor**; el **etiquetado polimórfico** (`entity_norms`) es aditivo y acotado por organización; no hay dato personal ni endpoint público nuevo. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Peligro **sin proceso** lo gestiona cualquier Líder de proceso (semántica NULL-scope de `has_role(org,'lider_proceso',null)`). Actor siempre rol SIG de la **misma** organización; sin cruce. | `031` `can_manage_sig(org, process)` con `process` nulo. Mismo patrón NULL-scope de los módulos previos (APTO). | Asignar proceso a los peligros; si se quisiera, exigir Líder SIG para los sin proceso. No bloquea. |

## Verificaciones (sin hallazgos)

### Multi-norma / etiquetado polimórfico
- `norms` y `entity_norms` con RLS solo-SELECT por `can_see_sig`; `hazard_counters` deny-all. `upsert_norm`/`set_norm_active` exigen **Líder SIG o Admin** de la organización; `set_entity_norms` exige `can_manage_sig` y valida `entity_type` y que las normas sean de la **misma** organización (join por `organization_id`). Re-sincroniza por **baja lógica** (`is_active`), sin DELETE. Verificado: Sofía (consulta) no administra ni etiqueta; Beto (org B) no administra normas de A.
- **`entity_norms.entity_id` es polimórfico (sin FK):** no es un riesgo de aislamiento — la fila se inserta con el `organization_id` del actor (derivado del servidor) y solo es legible por su organización; un `entity_id` inexistente simplemente no casa con ninguna entidad al pintar los chips. No hay cruce entre organizaciones (verificado: inserción directa por REST bloqueada por RLS).

### Peligros SST (GTC-45)
- La **valoración** se calcula en el servidor: `NP = ND×NE`, `NR = NP×NC`, y `gtc45_level(NR)` → I/II/III/IV; los factores se validan contra los valores GTC-45 permitidos (ND∈{0,2,6,10}, NE∈{1..4}, NC∈{10,25,60,100}) — verificado: NP=40/NR=4000/Nivel I; ND inválido rechazado; edición recalcula (2×2×25=100). El cliente muestra el cálculo en vivo pero **no** lo persiste.
- Todas las mutaciones exigen `can_manage_sig(org, process)`; `hazard_or_fail` resuelve por id (definer) + `is_active_member`. Baja lógica `inactivo` → no editable (verificado). Numeración `PEL-AAAA-###` atómica (`hazard_counters`). `queries.ts` usa el cliente del usuario (RLS), sin admin/service_role.

### Validación / errores / dependencias
- Server actions con zod (enums de clasificación, ND/NE/NC restringidos, longitudes, UUIDs); `guard/ok/fail`; `dbMessage` oculta errores crudos. `exportHazardsCsv` con `toCsv` (anti-fórmula) sobre filas acotadas por RLS. **Sin dependencias nuevas**; sin dato personal (peligros y su valoración; `area` es texto de cargo/área, no persona identificada).

### Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) incluye ahora `hazard_counters` (deny-all intencional).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs/helpers: patrón aceptado. **`anon_security_definer_function_executable` sigue en 2** (solo las RPC públicas de la encuesta); las funciones de este módulo **no** son ejecutables por `anon`. **Sin `function_search_path_mutable`**.

## Notas de alcance (no hallazgos)
- Este release entrega: catálogo de Normas (Admin), módulo **Peligros/GTC-45** completo, e **infra de etiquetado** (RPC `set_entity_norms`, `NormChip`/`NormPicker`/`NormTagger`, queries). El **cableado de chips/filtros por norma en los 6 módulos existentes** y el **segmento "Norma" del Tablero** se despliegan como incremento siguiente (ADR-045, aditivo y por partes) para no arriesgar los módulos en producción. La infra ya está auditada aquí.

## Condiciones
- Ninguna que bloquee el despliegue. **Condiciones de ampliación:** auditar cada incremento de cableado por módulo (lectura de `entity_norms`, sin escritura nueva); los **aspectos ambientales 14001** (v1.1-4b) se auditan al implementarse.
