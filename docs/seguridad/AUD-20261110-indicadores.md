# Auditoría de seguridad — Módulo 3: Indicadores de gestión / KPIs (ISO 9001 9.1)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `022_indicadores.sql` (tablas `indicators`/`indicator_measurements`/`indicator_counters`, RLS, helpers `can_see_indicators`/`can_manage_indicators`, función `indicator_compliance`, RPCs `create_indicator`/`update_indicator`/`archive_indicator`/`unarchive_indicator`/`record_measurement`/`generate_nc_from_measurement`, numeración `IND-AAAA-###`, `ALTER` de `nonconformities.source` +`'indicador'` y de `tasks`); `src/lib/data/queries.ts` (`listIndicators`/`getIndicatorSummary`/`getIndicator`); `src/lib/data/actions.ts` (server actions del módulo); `src/components/indicadores/*`; `src/app/app/indicadores/**`; navegación.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO de No Conformidades y Auditorías: RLS solo-SELECT con política por `organization_id`, escritura exclusiva por RPC `SECURITY DEFINER` con autorización interna por rol, FKs compuestas `(id, organization_id)` que impiden el cruce entre organizaciones, y server actions con validación zod que nunca confían en el `org` del cliente. El estado de cumplimiento se calcula y persiste solo en el servidor; `generate_nc_from_measurement` ya nace con `for update` (idempotente ante concurrencia). No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · 0 Bajos abiertos. Habilitado para testing y despliegue.

## Verificaciones (sin hallazgos)

### Aislamiento multi-tenant
- RLS activo en las 3 tablas. Políticas SELECT (`indicator_select`/`indicator_measurement_select`) por `can_see_indicators(organization_id)`. `indicator_counters` **deny-all intencional** (sin política) — advisor `rls_enabled_no_policy` INFO esperado, igual que `nc_counters`/`audit_counters`/`email_outbox`/`platform_admins`.
- FKs compuestas `(id, organization_id)` en `indicators` y `(indicator_id, organization_id)`/`(process_id, organization_id)`/`(owner_position_id, organization_id)`/`(nonconformity_id, organization_id)`: impiden enlazar filas de otra organización. Un `p_process`/`p_owner` de otra organización hace fallar el INSERT por FK y revierte la transacción.
- `queries.ts`: todas las lecturas pasan por `scope()` (resuelve el `org` en servidor) y filtran `organization_id` como defensa en profundidad sobre RLS. Prueba RLS: «Nadie inserta indicadores por REST» → `new row violates row-level security policy` (no hay política INSERT; la escritura va solo por RPC).

### Autorización de las mutaciones
- `create_indicator`/`update_indicator`/`archive_indicator`/`unarchive_indicator` exigen `can_manage_indicators` (= `has_role('lider_sig')`). Verificado por pruebas RLS (Sofía/consulta y Beto/otra org rechazados al crear; Laura rechazada al archivar).
- `record_measurement` y `generate_nc_from_measurement` exigen `can_manage_indicators` **o** `has_role(org,'lider_proceso', indicator.process_id)`. El tercer argumento (`process`) es **no nulo** (el proceso del indicador), por lo que `has_role` solo acepta a un líder del **mismo** proceso o de alcance global; **no hay bypass por NULL** (a diferencia del MED-01 histórico de NC). Verificado: Laura (líder de `sigA`) captura su indicador pero es rechazada en uno de `tiA`; Sofía (consulta) es rechazada.
- `indicator_or_fail` selecciona por id (definer, omite RLS) y valida `is_active_member(org)`: un usuario de otra organización no puede operar el indicador → error `P0002` genérico, sin revelar existencia.

### Integridad del cálculo de cumplimiento
- El `compliance` (cumple/en_riesgo/no_cumple) **se calcula y persiste en el RPC** (`indicator_compliance`, `immutable`, `search_path=''`), nunca se acepta del cliente. El cálculo cliente (`estimateCompliance`) es solo una vista previa. Verificado por pruebas RLS que el valor derivado es correcto por sentido (mayor/menor/rango y tasa). `indicator_compliance` tiene `execute` revocado de `public`/`anon`/`authenticated` (solo lo invocan los RPC definidores).

### `record_measurement` (casos borde)
- `period` normalizado con `date_trunc('month', p_period)::date`; `unique(indicator_id, period)` + `on conflict do update` → **upsert** atómico (corrige, no duplica; verificado).
- Indicador de tasa: exige numerador/denominador y **rechaza denominador 0** (`22012`, verificado). Si no es tasa, ignora num/den aunque se envíen.
- Rechaza registrar sobre un indicador `archivado`.

### `generate_nc_from_measurement`
- `select ... for update` sobre la medición desde el inicio → idempotente ante doble clic/concurrencia (verificado: segunda llamada «ya tiene una no conformidad»).
- Exige `compliance = 'no_cumple'` (verificado: una medición que cumple no genera NC) y `nonconformity_id` nulo.
- Reusa `report_nonconformity` con el `org` del indicador ya validado (sin escalada ni cruce); `auth.uid()` anidado conserva al autor real. `source = 'indicador'`.

### `ALTER` del enum `nonconformities.source`
- Se reconstruyó el `check` conservando los 7 valores previos y agregando `'indicador'`; las filas existentes siguen siendo válidas → **no rompe el Módulo 1**. El tipo `NcSource`, `SOURCE_LABELS` y su prueba de completitud se actualizaron en el mismo cambio (171→175 unitarias cubren la completitud).

### Validación de entrada / errores / secretos
- Server actions con zod: uuids validados, `name` 3–200, `unit` 1–20, `description`/`note` ≤ 2000, `tolerancePct` 0–100, enums de sentido/frecuencia; `fail()` con mensajes genéricos; `dbMessage` evita filtrar errores crudos. Las cotas de longitud están puestas desde el inicio (lección BAJO-02 de Auditorías ya aplicada).
- Server Actions de Next.js (no route handlers) → CSRF por verificación de origen integrada.
- Sin secretos en la migración ni en el código. Sin dependencias nuevas (la gráfica es SVG propio, ADR-014). Headers/middleware sin cambios.

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) sobre `indicator_counters`: **intencional** (deny-all).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs del módulo: **patrón aceptado** del proyecto (escritura por RPC con autz interna; idéntico a riesgos/NC/auditorías). `search_path = ''` fijado en todas las funciones nuevas; ninguna aparece con `function_search_path_mutable`.

## Observación no bloqueante (eficiencia, no seguridad) — RESUELTA
- `getIndicator` cargaba los códigos de NC de toda la organización (bajo RLS) para resolver los enlaces de las mediciones. No había fuga (RLS-scoped). **Corregido en esta fase:** ahora acota con `.in(ncIds)` solo las NC referenciadas, igual que `getAudit`.

## Condiciones
- Ninguna que bloquee el despliegue. Ampliaciones futuras (cuadro de mando/BSC, fórmulas automáticas, recálculo histórico, alertas por correo) deberán auditarse al implementarse.
