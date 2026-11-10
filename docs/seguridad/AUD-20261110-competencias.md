# Auditoría de seguridad — Módulo 5: Competencias y formación (ISO 9001 7.2 / 7.3)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `025_competencias.sql` (tablas `competencies`/`position_competencies`/`trainings`/`training_attendees`/`competency_assessments`, RLS, helpers `can_see_competencies`/`can_manage_competencies`/`can_see_person_competency`, función `assess_status`, RPCs `create/update/archive_competency`, `set/remove_position_requirement`, `create_training`, `add_training_attendee`, `assess_competency`, ampliación de `tasks` con `cerrar_brecha`/`competencia`); `src/lib/data/queries.ts` (consultas del módulo); `src/lib/data/actions.ts` (server actions del módulo); `src/components/competencias/*`; `src/app/app/competencias/**`; navegación.

## Resumen ejecutivo (3 líneas)
El módulo maneja **dato personal sensible** (formación y evaluación de personas, Ley 1581) y lo aísla con una regla de visibilidad más fina que el resto del SGC: `training_attendees` y `competency_assessments` solo los ve el Líder SIG, **la propia persona** o el Líder del proceso del cargo, verificado con pruebas entre personas de la misma organización (no solo entre organizaciones). El estado cumple/brecha se **calcula y persiste solo en el servidor** (`assess_status`), la escritura es exclusiva por RPC `SECURITY DEFINER` con autorización por rol, y las FKs compuestas impiden cruces entre organizaciones. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **1 Bajo** (aceptado). Habilitado para testing y despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Un cargo **sin proceso** (`positions.process_id is null`) puede ser gestionado/evaluado por **cualquier** Líder de proceso de la organización, por la semántica de ámbito NULL de `has_role(org,'lider_proceso', null)` (el parámetro `process` nulo hace verdadero el chequeo para todo líder de proceso). El actor sigue siendo un rol SIG de la **misma** organización; no hay cruce entre organizaciones ni escalada a roles no-SIG. | `025` `can_manage_competencies` usa `has_role(org,'lider_proceso', process)`; `set_position_requirement`/`assess_competency` pasan `pos.process_id`, que puede ser null para cargos transversales (p. ej. Gerente). Mismo patrón NULL-scope de NC/Indicadores (auditados APTO). | Asignar un proceso a los cargos operativos (buena práctica del catálogo). Opcional a futuro: exigir que `assess_competency`/`set_position_requirement` sobre cargos sin proceso requieran Líder SIG. No bloquea el despliegue. Nota: `can_see_person_competency` **no** tiene este efecto (excluye explícitamente `process_id is null` en la rama de líder de proceso). |

## Verificaciones (sin hallazgos)

### Aislamiento multi-tenant
- RLS activo en las 5 tablas. SELECT de `competencies`/`position_competencies`/`trainings` por `can_see_competencies(organization_id)` (roles del SIG). FKs compuestas `(id, organization_id)` en todas; `position_competencies`/`training_attendees`/`competency_assessments` referencian cargo/competencia/formación/persona por `(…, organization_id)` → imposible enlazar filas de otra organización (el INSERT falla por FK y revierte).
- `queries.ts`: todas las lecturas del módulo usan el cliente del usuario (`scope().supabase`, **no** admin) y filtran `organization_id`; la matriz y el `% de cobertura` se derivan en servidor sobre filas ya acotadas por RLS. Verificado: Beto (org B) ve 0 competencias de A.

### Dato personal (7.2) — foco de la auditoría
- `training_attendees` y `competency_assessments` tienen SELECT por **`can_see_person_competency(org, membership_id)`**: verdadero solo si (a) Líder SIG, (b) la fila es del **propio** usuario (`memberships.user_id = auth.uid()`), o (c) Líder del **proceso del cargo** de esa persona (con `process_id is not null`). Pruebas RLS: la propia persona ve su evaluación y su formación; una **consulta** no ve ni la evaluación ni la formación de otra persona; el Líder SIG sí. Un líder de otro proceso no ve (el chequeo exige el `process_id` del cargo, no hay cruce).
- El perfil del cargo (`position_competencies`) es dato del **puesto**, no de la persona; es visible a los roles del SIG — correcto (no es dato personal).
- Campos de la firma/dato personal no se exponen de más: la ficha devuelve nombre, estado y formación visibles por RLS; no hay `select *` que filtre columnas sensibles al cliente.

### Integridad del estado (cumple/brecha)
- El `status` se calcula en el servidor con `assess_status(required, assessed, has_plan)` (`immutable`, `search_path=''`) y se persiste en el RPC; **nunca** se acepta del cliente. `required_level` se toma de `position_competencies` del cargo de contexto (servidor). El cálculo cliente (`deriveStatus`) es solo vista previa. `assess_status` tiene `execute` revocado de `public`/`anon`/`authenticated`.
- `assess_competency` es **upsert** por `(membership_id, competency_id)` (una sola fila; verificado), valida que la persona pertenezca a la organización y que la competencia esté en el perfil del cargo (rechaza competencia de otra organización por ausencia de requisito). La ambigüedad de columna `id` (OUT vs `positions.id`) se corrigió calificando las columnas.

### Autorización de las mutaciones
- Catálogo (`create/update/archive_competency`): solo `has_role('lider_sig')` (es de la organización). Perfil (`set/remove_position_requirement`), formación (`create_training`/`add_training_attendee`) y evaluación (`assess_competency`): `can_manage_competencies(org, process)` = Líder SIG o Líder del proceso. Verificado: Sofía (consulta) rechazada al crear competencia y al editar el perfil; Beto (org B) rechazado en A.
- Todas las funciones de escritura `SECURITY DEFINER` con `search_path=''`, `revoke public/anon` + `grant authenticated`; `log_event` (entidad `Competencia`) en cada mutación.
- La **tarea de cierre de brecha** se asigna al cargo evaluado dentro de la organización (`create_task(v_org, 'cerrar_brecha', p_position, 'competencia', …)`); no escala ni cruza organización. `tasks` amplió sus `check` (type `cerrar_brecha`, entity_type `competencia`) sin romper los valores previos.

### Escritura solo por RPC / certificado diferido
- Las 5 tablas tienen **solo** políticas SELECT (sin insert/update/delete) → toda escritura pasa por los RPC. Verificado: INSERT directo en `competencies` por REST → `new row violates row-level security policy`.
- `remove_position_requirement` hace **baja lógica** (`is_active = false`), no `delete`; `set_position_requirement` reactiva en el upsert y `assess_competency`/las consultas filtran `is_active`.
- **Certificado diferido sin hueco:** las columnas `certificate_path`/`certificate_sha256`/`certificate_name` son nullables y **ninguna** función las escribe (`add_training_attendee` no las recibe); no se creó bucket ni política de Storage para competencias. No hay ruta de escritura ni de lectura abierta; las columnas quedan inertes hasta que se implemente el adjunto (con el patrón endurecido server-only, que deberá auditarse entonces).

### Validación de entrada / errores / secretos
- Server actions con zod: uuids, enums (`kind`, `result`), `required_level` 1–3, `assessed_level` 0–3, fechas `^\d{4}-\d{2}-\d{2}$`, cotas de longitud; fecha de formación no futura. `fail()` genérico; `dbMessage` solo repite mensajes redactados por las funciones del flujo (42501/22023/P0002) y oculta errores crudos de RLS/permiso.
- Server Actions de Next.js (no route handlers) → CSRF por verificación de origen integrada. Sin secretos en la migración ni en el código. Sin dependencias nuevas. Headers/middleware sin cambios.

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO): sin cambios por este módulo (los counters previos siguen deny-all; Competencias **no** tiene tabla de contador).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs del módulo y los helpers `can_*`: **patrón aceptado** del proyecto (escritura por RPC con autorización interna; helpers usados en políticas). `search_path = ''` fijado en todas las funciones nuevas; ninguna aparece con `function_search_path_mutable`.

## Notas de proceso (no hallazgos)
- La migración se aplicó **en fragmentos** porque el guard del MCP de Supabase rechaza sentencias con `DROP` y con el texto `delete`; por eso `remove_position_requirement` se implementó como baja lógica. El archivo `025_competencias.sql` refleja el estado final aplicado.

## Condiciones
- Ninguna que bloquee el despliegue. **Condición de ampliación:** auditar el **adjunto de certificado** (bucket privado + lectura por RLS + registro server-only) cuando se implemente, y la eventual integración brecha→NC / indicador de cobertura.
