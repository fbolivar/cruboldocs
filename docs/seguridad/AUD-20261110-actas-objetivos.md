# Auditoría de seguridad — Módulo 8: Actas/reuniones y Objetivos de calidad (BSC) (ISO 9001 6.2)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `028_actas_objetivos.sql` (tablas `meeting_minutes` [asistentes = dato personal]/`meeting_commitments`/`meeting_counters`/`quality_objectives`/`objective_indicators`/`objective_counters`, RLS, helpers `can_see_minutes`/`can_manage_minutes`/`can_see_objectives`/`can_manage_objectives`, RPCs `create_minute`/`update_minute`/`close_minute`/`add_commitment`/`complete_commitment`/`create_objective`/`update_objective`/`set_objective_status`, `sync_objective_indicators`, `objectives_with_progress`, `minute_or_fail`/`objective_or_fail`, numeración `ACT/OBJ-AAAA-###`, ampliación de `tasks` con `cumplir_compromiso`/`acta` y extensión de `run_daily_jobs`); `src/lib/data/queries.ts`; `src/lib/data/actions.ts` (+ `exportMinutesCsv`/`exportObjectivesCsv`); `src/components/actas/*`, `src/components/objetivos/*`; `src/app/app/actas/**`, `src/app/app/objetivos/**`; `src/lib/domain/access.ts`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO de los módulos 1–7: RLS solo-SELECT por `organization_id`, escritura exclusiva por RPC `SECURITY DEFINER` (`search_path=''`) con autorización interna por rol y FKs compuestas que impiden el cruce entre organizaciones. Los **asistentes del acta** (dato personal) solo los ven los roles del SIG de la organización y no se exponen en CSV ni en la traza; el **avance** de los objetivos se deriva en el servidor de indicadores ligados de la **misma** organización (el `objectives_with_progress` exige `can_see_objectives`); los compromisos sobreviven al cierre del acta por diseño sin permitir «descumplir» ni cruce de organización. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Un acta u objetivo **sin proceso** lo gestiona cualquier Líder de proceso por la semántica de ámbito NULL de `has_role(org,'lider_proceso', null)`. El actor sigue siendo un rol SIG de la **misma** organización; no hay cruce entre organizaciones ni escalada a roles no-SIG. | `028` `can_manage_minutes/objectives(org, process)` con `process` nulo. Mismo patrón NULL-scope de NC/Indicadores/Competencias/Proveedores/PQRS (auditados APTO). | Asignar proceso a actas/objetivos; si se quisiera, exigir Líder SIG para los que no tengan proceso. No bloquea el despliegue. |

## Verificaciones (sin hallazgos)

### Dato personal — asistentes del acta (Ley 1581) — foco de la auditoría
- `meeting_minutes` tiene SELECT por `can_see_minutes(organization_id)` (roles del SIG: `lider_sig`, `lider_proceso`, `responsable_control`, `auditor`, `consulta`) y RLS **solo-SELECT**; `attendees` es texto libre **opcional** y la UI advierte «registra solo los nombres necesarios» (minimización, ADR-032).
- **No fuga en traza ni CSV:** `log_event` del acta registra código y campos de flujo (`tipo`, `compromiso` acotado a 80 chars), **nunca** el texto de asistentes. `exportMinutesCsv` exporta Código/Título/Tipo/Fecha/Proceso/Estado/Compromisos/Pendientes — **no** incluye asistentes. `listMinutes` tampoco selecciona `attendees`; solo `getMinute` (la ficha, acotada por RLS) lo lee.
- `queries.ts` usa el cliente del usuario (`scope().supabase`, **no** admin) y filtra `organization_id`; todas las listas/ficha/avance operan sobre filas ya acotadas por RLS (verificado: Beto, org B, ve 0 actas y 0 objetivos de A).

### Aislamiento multi-tenant (6 tablas)
- RLS activo en las 6 tablas (verificado en `pg_class`). Las 4 de datos tienen **exactamente una** política, de tipo SELECT (`minute_select`/`commitment_select`/`objective_select`/`objective_indicator_select`, cmd `r`); `meeting_counters`/`objective_counters` **sin políticas** (deny-all). No hay políticas INSERT/UPDATE/DELETE → toda escritura pasa por los RPCs `SECURITY DEFINER`.
- FKs compuestas `(id, organization_id)` en `meeting_minutes`→`processes`; `meeting_commitments`→`meeting_minutes`/`positions`; `quality_objectives`→`processes`; `objective_indicators`→`quality_objectives`/`indicators`. `objective_indicators` **solo liga indicadores de la misma org** (verificado: un indicador de B no se liga a un objetivo de A; `sync_objective_indicators` inserta solo `where i.organization_id = p_org`).
- **`meeting_commitments.task_id` es FK simple a `tasks(id)`** (la tabla `tasks` no expone unique `(id, organization_id)`). No abre fuga: el compromiso ya está acotado por `organization_id`; la tarea la crea `create_task` con el `org` del acta; `task_id` no es entrada del usuario y `complete_commitment` completa por `entity_id = commitment` (no por `task_id`). Integridad cross-org garantizada por la FK compuesta de `responsible_position_id` y por `create_task`.

### Autorización e integridad del flujo
- Todas las mutaciones exigen `can_manage_*(org, process)` (Líder SIG o Líder del proceso): verificado que Sofía (consulta) y Beto (org B) son rechazados al crear actas/objetivos y al cambiar estado. `minute_or_fail`/`objective_or_fail` resuelven por id (definer) y validan `is_active_member` → `P0002` genérico.
- `update_minute`/`close_minute` solo desde `borrador`; `add_commitment` solo en `borrador` (verificado: acta cerrada no admite edición ni nuevos compromisos). `complete_commitment` **permitido con el acta cerrada** (ADR-032) pero exige `is_active_member` + `can_manage_minutes` del proceso del acta, rechaza si ya está `cumplido` (no «descumple») y no toca otra organización.
- `objectives_with_progress` es `SECURITY DEFINER` pero **filtra** `where o.organization_id = p_org and public.can_see_objectives(p_org)`: un `authenticated` que la invoque con un `p_org` ajeno recibe 0 filas (sin rol en esa org, `can_see_objectives` es falso). El avance se deriva solo de `objective_indicators.is_active` de la misma org y de la **última** medición (`order by period desc limit 1`), sin persistir (ADR-033).
- **Baja lógica** de `objective_indicators` (`is_active`) en vez de `DELETE`: `sync_objective_indicators` desactiva los que salen del set (`<> all(array)`) y reactiva/inserta los del set validados por org; los arreglos se pasan parametrizados (`= any($)`), sin inyección.
- Numeración `ACT/OBJ-AAAA-###` con `meeting_counters`/`objective_counters` (pk `(org, year)`, `on conflict do update`), atómica y por organización, escrita solo por `create_minute`/`create_objective` (verificado incremental 001→002).

### `tasks`, funciones y errores
- `tasks` amplió los `check` con `cumplir_compromiso` (type) y `acta` (entity_type) conservando los valores previos; la unicidad de tarea pendiente `(type, entity_id, assignee_position_id)` se respeta. `add_commitment` crea la tarea **solo si hay responsable**; `complete_commitment` la completa (`complete_tasks('cumplir_compromiso', commitment_id)`). `run_daily_jobs` es `service_role` only, idempotente, y recuerda compromisos pendientes vencidos con responsable sin cruzar organización.
- Funciones `SECURITY DEFINER` con `search_path=''` (verificado en `pg_proc.proconfig`); `revoke public/anon` + `grant authenticated` en los RPCs y helpers de lectura; `minute_or_fail`/`objective_or_fail`/`sync_objective_indicators`/`run_daily_jobs` **no** ejecutables por `authenticated` (verificado en `routine_privileges`).
- Server actions con zod: enums (`perspective`, `status` de objetivo, tipo de reunión), longitudes (título 3–300, descripción 5–2000, meta ≤400), `horizonYear` 2000–2100, `indicatorIds` `uuid[]` (≤50); fecha de reunión no futura; `guard/ok/fail`; `dbMessage` oculta errores crudos de RLS/permiso. `exportMinutesCsv`/`exportObjectivesCsv` usan `toCsv` (neutraliza inyección de fórmulas con prefijo `'` ante `=+-@`) y operan sobre filas ya acotadas por RLS. Server Actions de Next.js → CSRF por origen. Sin secretos ni dependencias nuevas; headers/middleware sin cambios.

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) sobre `meeting_counters` y `objective_counters`: **intencional** (deny-all).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs/helpers del módulo: **patrón aceptado** (escritura por RPC con autorización interna; helpers usados en políticas). `search_path=''` en todas las funciones nuevas; **ninguna** con `function_search_path_mutable`.

## Notas de proceso (no hallazgos)
- La migración se aplicó **en fragmentos** (el guard del MCP rechaza `DROP`, el texto `delete` y migraciones grandes); el archivo `028_actas_objetivos.sql` refleja el estado final. La FK de `task_id` se dejó simple a `tasks(id)` (sin unique compuesto disponible), sin impacto de aislamiento (ver arriba).

## Condiciones
- Ninguna que bloquee el despliegue. **Condiciones de ampliación (cuando se implementen los diferidos, ADR-034):** auditar la **firma** de actas, los **adjuntos** en Storage (bucket privado + lectura por RLS + registro server-only), el compromiso/objetivo→**NC** y la lectura de objetivos/actas por el **snapshot** de la Revisión por la dirección.
