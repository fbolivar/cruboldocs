# Auditoría de seguridad — Módulo 4: Revisión por la dirección (ISO 9001 9.3)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `023_revision_direccion.sql` (tablas `management_reviews`/`review_outputs`/`management_review_counters`, RLS, helpers `can_see_reviews`/`can_manage_reviews`, función `compute_review_snapshot`, `review_or_fail`, RPCs `create_review`/`refresh_review_snapshot`/`update_review`/`add_review_output`/`generate_nc_from_output`/`close_review`/`cancel_review`, numeración `RD-AAAA-###`); `src/lib/data/queries.ts` (`listReviews`/`getReview`, `toSnapshot`/`toInputs`); `src/lib/data/actions.ts` (server actions del módulo, en particular `closeReview`); `src/components/revisiones/*`; `src/app/app/revisiones/**`; navegación.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO de NC/Auditorías/Indicadores: RLS solo-SELECT por `organization_id`, escritura exclusiva por RPC `SECURITY DEFINER` con autorización interna por rol (`lider_sig`), FKs compuestas `(id, organization_id)` que impiden el cruce entre organizaciones, y server actions con zod que nunca confían en el `org` del cliente. El `compute_review_snapshot` lee seis módulos filtrando siempre `organization_id = p_org` y queda `execute` revocado de `authenticated` (solo lo invocan los RPC); el cierre firmado congela el acta, que es inmutable tras cerrar. Se halló **un hallazgo Medio**: la reautenticación de la firma (ADR-004) solo se aplica en la server action y no en la base, porque `close_review` es ejecutable por `authenticated` — a diferencia de la firma de documentos (`sign_version_checked`, admin-only).

## Veredicto: **APTO CON CONDICIONES**
0 Críticos · 0 Altos · **1 Medio** · 1 Bajo abiertos.

Sin Críticos ni Altos → **no se bloquea el despliegue** por la regla del pipeline. El Medio (MED-01) no es explotable sin una sesión de Líder SIG ya autenticada y no permite cruce entre organizaciones ni escalada; se recomienda cerrarlo con una migración de endurecimiento **antes de apoyarse en la firma del acta como registro de no repudio ante auditoría ISO**. Decisión de Fernando: aplicar el endurecimiento ahora o aceptar el riesgo residual documentado.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| MED-01 | **Medio** | La reautenticación del cierre firmado (ADR-004) solo se exige en la server action, no en la base. `close_review` está concedida a `authenticated`, y sus parámetros `p_reauth_at` y `p_hash` son **autoaseverados por quien llama**: el RPC solo comprueba que `p_reauth_at` sea reciente (< 10 min) y que `p_hash` cumpla `^[0-9a-f]{64}$`, pero no verifica que la contraseña se haya reingresado ni recomputa el hash. Un Líder SIG con sesión activa (o una sesión **secuestrada** por XSS/robo de cookie) puede cerrar y «firmar» el acta invocando `/rest/v1/rpc/close_review` directamente, sin la contraseña, pasando `p_reauth_at = now()` y un hash falso que pase la regex. Contrasta con la firma de documentos, cuyo paso final (`sign_version_checked`) es **admin-only** (no ejecutable por `authenticated`), por lo que su reautenticación no se puede saltar (endurecimiento RA-10). | `023_revision_direccion.sql` L307-331 (`close_review` definer + `grant execute ... to authenticated` L352-353); advisor Supabase confirma `close_review` ejecutable por `authenticated` y que `sign_version_checked` **no** lo es; `actions.ts` L1795-1820 (la reauth con `createEphemeralClient` + `signInWithPassword` vive solo en la acción). | Seguir el patrón de `sign_version_checked`: **revocar `close_review` de `authenticated`** y llamarla con `createAdminClient()` pasando `p_approver = user.id` explícito (dado que hoy usa `auth.uid()`, que sería nulo bajo service role). Así el único camino para firmar pasa por la acción que reautentica. Alternativa equivalente: emitir en el servidor un *nonce* de un solo uso por reauth y exigirlo en el RPC. La corrección es barata y aislada. |
| BAJ-01 | Bajo | `update_review` persiste `p_inputs jsonb` sin acotar forma ni tamaño en la base (`coalesce(p_inputs,'{}')`); confía en la server action + zod (5 claves string, ≤ 4000). Un Líder SIG por REST directo podría almacenar jsonb arbitrario o grande en `inputs` de su **propia** organización. | `023` L254-259; `actions.ts` L1719-1745 (`reviewInputsSchema`). | Impacto bajo: `toInputs()` coacciona a las 5 claves al leer, así que nada arbitrario se renderiza; el blast radius es la propia org. Opcional: validar claves/longitud en el RPC o normalizar a columnas. Idéntico criterio aceptado que `create_risk(p_controls jsonb)`. |

## Verificaciones (sin hallazgos)

### Aislamiento multi-tenant
- RLS activo en las 3 tablas. Políticas SELECT (`review_select`/`review_output_select`) por `can_see_reviews(organization_id)`. `management_review_counters` **deny-all intencional** (sin política) — advisor `rls_enabled_no_policy` INFO esperado, igual que `nc_counters`/`indicator_counters`/`audit_counters`.
- FKs compuestas: `management_reviews unique(id, organization_id)`; `review_outputs` referencia `(review_id, organization_id)`, `(responsible_position_id, organization_id)` y `(nonconformity_id, organization_id)` → imposible enlazar un acta, un cargo o una NC de otra organización; el INSERT falla por FK y revierte.
- `queries.ts`: `listReviews`/`getReview` pasan por `scope()` (resuelve el `org` en servidor) y filtran `organization_id`. En `getReview`, el `.in("id", ncIds)` sin filtro de org no es fuga: los `ncIds` salen de `review_outputs` de la propia org (FK compuesta) y la RLS de `nonconformities` acota el SELECT (mismo criterio que `getIndicator`/`getAudit`).

### Integridad del snapshot (9.3.2) y lecturas cruzadas de módulos
- `compute_review_snapshot(p_org, p_start, p_end)` es `SECURITY DEFINER`, `search_path = ''` y tiene **`execute` revocado de `public`/`anon`/`authenticated`** (L349): no es invocable directamente para sondear datos; solo la llaman `create_review`/`refresh_review_snapshot`.
- El `p_org` no se acepta libremente: `create_review` exige `can_manage_reviews(p_org)` antes de computar; `refresh_review_snapshot` usa `r.organization_id` resuelto por `review_or_fail` (valida `is_active_member`). **Toda** subconsulta del snapshot filtra `organization_id = p_org` (NC, auditorías+hallazgos, mediciones de indicadores activos, riesgos residuales, controles, documentos, acta previa) → no hay lectura cruzada entre organizaciones aunque lea seis tablas de otros módulos.
- El snapshot se **persiste en el servidor** y se congela al cerrar (`close_review` no recalcula). El acta cerrada es inmutable: todas las mutaciones (`update_review`/`add_review_output`/`refresh_review_snapshot`/`cancel_review`) exigen `status = 'borrador'` y no existe RPC para editar un acta cerrada; la RLS es solo-SELECT (sin UPDATE directo).

### Autorización de las mutaciones
- `create_review`/`refresh_review_snapshot`/`update_review`/`add_review_output`/`generate_nc_from_output`/`close_review`/`cancel_review` exigen `can_manage_reviews` (= `has_role('lider_sig')`). `can_see_reviews` abarca los roles SIG (lider_sig, lider_proceso, responsable_control, auditor, consulta) solo para lectura.
- `review_or_fail` selecciona por id (definer, omite RLS) y valida `is_active_member(org)`: un usuario de otra organización no puede operar el acta → `P0002` genérico, sin revelar existencia.

### `generate_nc_from_output` (idempotencia)
- `select ... for update` sobre la salida desde el inicio → idempotente ante doble clic/concurrencia. Exige `kind = 'accion_mejora'` y `nonconformity_id` nulo (segunda llamada → «ya tiene una no conformidad»). Reusa `report_nonconformity` con el `org` del acta ya validado (sin escalada ni cruce; `auth.uid()` conserva al autor), `source = 'mejora'`, severidad `menor`. Nota (por diseño, no hallazgo): puede ejecutarse sobre una salida de un acta ya **cerrada** — es una acción aditiva (enlaza la NC) que no altera el contenido del acta y es un flujo deseable (cerrar el acta y luego lanzar la NC).

### Firma del cierre (ADR-004) — además de MED-01
- La reautenticación en la acción es correcta: cliente efímero (`createEphemeralClient(ip)`), `signInWithPassword` contra Auth, verificación `reauth.user?.id === user.id`, `signOut` local, límite `firma:usuario` *fail-closed*, captura de IP y `user-agent` (≤ 400). `approved_by = auth.uid()` (no del cliente), `approved_at = now()`.
- Datos sensibles de la firma (`ip`, `user_agent`, `approval_hash`, `reauth_at`) **no se exponen al cliente**: `getReview` mapea campos explícitos (código, estado, `approvedByName`, `approvedAt`, salidas, snapshot, inputs, timeline) y omite esos campos. El `approval_hash` no sella el contenido del acta (a diferencia del PDF en documentos), pero la inmutabilidad post-cierre lo compensa.

### Validación de entrada / errores / secretos
- Server actions con zod: uuids validados (`isUuid`), `title` 3–200, `scope`/`attendees` ≤ 2000, 5 entradas de texto ≤ 4000, `description` 5–2000, enum `kind`, fechas `^\d{4}-\d{2}-\d{2}$`, `periodEnd >= periodStart` (también en el RPC). `fail()` genérico; `dbMessage` solo repite mensajes redactados por las funciones del flujo (42501/22023/P0002) y oculta errores crudos de RLS/permiso (RA-13).
- Server Actions de Next.js (no route handlers) → CSRF por verificación de origen integrada.
- Sin secretos en la migración ni en el código. Sin dependencias nuevas. Headers/middleware sin cambios.

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) sobre `management_review_counters`: **intencional** (deny-all).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs del módulo: **patrón aceptado** del proyecto (escritura por RPC con autorización interna por rol). **Excepción:** para `close_review` este WARN es, además, el síntoma de MED-01 (debería pasar a admin-only como `sign_version_checked`). `search_path = ''` fijado en todas las funciones nuevas; ninguna aparece con `function_search_path_mutable`.

## Condiciones
1. **MED-01 (recomendada antes de producción si la firma del acta se usará como evidencia de no repudio):** migración de endurecimiento que lleve `close_review` a admin-only con `p_approver` explícito. Si Fernando prefiere desplegar ya, dejar constancia de la aceptación del riesgo residual y programar el endurecimiento.
2. BAJ-01 y ampliaciones futuras (exportación PDF del acta, resumen por IA de las entradas) deberán auditarse al implementarse.
