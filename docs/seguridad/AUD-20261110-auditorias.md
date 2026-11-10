# Auditoría de seguridad — Módulo 2: Auditorías internas (ISO 9001 9.2)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `020_auditorias.sql` (tablas `audits`/`audit_processes`/`audit_findings`/`audit_counters`, RLS, helpers `can_see_audits`/`can_manage_audits`, RPCs `plan_audit`/`start_audit`/`add_audit_finding`/`generate_nc_from_finding`/`close_audit`/`cancel_audit`, numeración `AUD-AAAA-###`, ampliación de `tasks`); `src/lib/data/queries.ts` (`listAudits`/`getAuditSummary`/`getAudit`); `src/lib/data/actions.ts` (server actions del módulo); `src/components/auditorias/*`; `src/app/app/auditorias/**`; navegación. Remediación en `021_auditorias_hardening.sql`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón de No Conformidades (ya APTO): RLS solo-SELECT con política por `organization_id`, escritura exclusiva por RPC `SECURITY DEFINER` con autorización interna por rol, FKs compuestas `(id, organization_id)` que impiden el cruce entre organizaciones, y server actions con validación zod que nunca confían en el `org` del cliente. No se hallaron vulnerabilidades Críticas ni Altas. Se detectaron y remediaron dos hallazgos Bajos (condición de carrera en la generación de NC e inputs sin cota superior).

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · 2 Bajos (remediados). Habilitado para testing y despliegue.

## Tabla de hallazgos

| ID | Severidad | Área | Estado |
|----|-----------|------|--------|
| BAJO-01 | Bajo | Integridad / concurrencia | **Remediado** (021) |
| BAJO-02 | Bajo | Validación de entrada (defensa en profundidad) | **Remediado** |

### BAJO-01 — Condición de carrera en `generate_nc_from_finding`
- **Evidencia:** la función leía el hallazgo con `select * into f ... where id = p_finding` sin bloqueo. La idempotencia (una NC por hallazgo) dependía de la guarda `if f.nonconformity_id is not null`. Dos invocaciones concurrentes del mismo hallazgo podían leer ambas `nonconformity_id = null`, llamar dos veces a `report_nonconformity` y crear **dos NC** para el mismo hallazgo. Mitigado parcialmente en el cliente por `disabled={pending}` en el botón "Generar no conformidad", pero no ante peticiones repetidas o múltiples pestañas.
- **Impacto:** calidad/integridad de datos (NC duplicada). No es fuga ni escalada; sin cruce de organización.
- **Remediación (aplicada, migración 021):** `select ... for update` sobre la fila del hallazgo. La segunda transacción concurrente espera, y al continuar ve `nonconformity_id` ya asignado → falla la guarda de idempotencia con error de negocio. Verificado: 218 pruebas RLS en verde tras el cambio.

### BAJO-02 — Inputs sin cota superior en `closeAudit`/`cancelAudit`
- **Evidencia:** las server actions `closeAudit` (conclusiones) y `cancelAudit` (motivo) validaban solo la longitud mínima; los demás campos del módulo sí tienen `.max()` vía zod. Un miembro autorizado (Líder SIG) podía enviar texto arbitrariamente largo a columnas `text`.
- **Impacto:** abuso de almacenamiento por un rol privilegiado. Bajo.
- **Remediación (aplicada):** cota superior en ambas acciones (`conclusions` ≤ 4000, `reason` ≤ 2000), coherente con `planAudit`/`addAuditFinding`.

## Verificaciones que pasaron (sin hallazgos)

### Aislamiento multi-tenant
- RLS activo en las 4 tablas. Políticas SELECT (`audit_select`/`audit_process_select`/`audit_finding_select`) por `can_see_audits(organization_id)`. `audit_counters` **deny-all intencional** (sin política; solo accesible por la función de servidor) — advisor `rls_enabled_no_policy` INFO esperado, igual que `nc_counters`/`email_outbox`/`platform_admins`.
- FKs compuestas `(id, organization_id)` en `audits`, y `(audit_id, organization_id)`/`(process_id, organization_id)`/`(nonconformity_id, organization_id)` en las tablas hijas: impiden enlazar filas de otra organización. Un `p_lead`/`p_process`/proceso de otra organización hace fallar el INSERT por violación de FK (la transacción revierte).
- `queries.ts`: todas las lecturas pasan por `scope()` (resuelve el `org` en servidor) y filtran `organization_id` como defensa en profundidad sobre RLS. Los sub-lookups heredan el aislamiento por la FK compuesta y la RLS de sus tablas.
- Prueba RLS: «Nadie inserta auditorías por REST» → `new row violates row-level security policy` (no hay política INSERT; la escritura va solo por RPC).

### Autorización de transiciones
- `plan_audit`/`start_audit`/`close_audit`/`cancel_audit` exigen `can_manage_audits` (= `has_role('lider_sig')`). `add_audit_finding`/`generate_nc_from_finding` exigen rol `auditor` **o** Líder SIG. Verificado por pruebas RLS (p. ej. «Un lider_proceso no registra hallazgos», «El Líder SIG cierra la auditoría»).
- `audit_or_fail` selecciona por id (definer, omite RLS) y valida `is_active_member(a.organization_id)`: un usuario de otra organización no puede operar la auditoría (membresía falsa) → error `P0002` genérico, sin revelar existencia.
- Transiciones de estado protegidas: iniciar exige `planificada`; registrar hallazgo y cerrar exigen `en_ejecucion`; cancelar rechaza `cerrada`/`cancelada`. Sin bypass por `NULL` (no se comparan posiciones nullable como en el MED-01 de NC; aquí la autz es por rol, no por dueño).

### `generate_nc_from_finding` (contrato cruzado con Módulo 1)
- Reusa `report_nonconformity`, que solo exige `is_active_member(p_org)` (reporte abierto); el `p_org` pasado es el de la auditoría ya validada → sin escalada ni cruce. `auth.uid()` anidado conserva al autor real (el auditor), no un rol definidor.
- Idempotente por diseño (guarda `nonconformity_id is not null`) y ahora también ante concurrencia (BAJO-01).
- `source = 'auditoria_interna'` es un valor permitido por el CHECK de `nonconformities.source`; `severity` del hallazgo (`menor`/`mayor`/`null`→`menor`) es subconjunto válido de la severidad de NC.

### Validación de entrada
- Server actions con zod: uuids validados, `title` 3–200, `objective`/`criteria` ≤ 2000, `processIds` 1–50 uuids, `description` 5–2000, `criteriaRef` ≤ 60, `type`/`severity` por enum. `fail()` devuelve mensajes genéricos; no se filtran errores crudos de la BD (`dbMessage`).
- Server Actions de Next.js (no route handlers) → protección CSRF por verificación de origen integrada; no requieren `isSameOrigin` (a diferencia de `/api/agente`).

### Secretos / dependencias / headers
- Sin secretos en la migración ni en el código del módulo. Sin dependencias nuevas. Headers y middleware sin cambios (reutiliza el pipeline existente, ya endurecido).

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) sobre `audit_counters`: **intencional** (deny-all).
- `authenticated_security_definer_function_executable` (WARN) sobre los RPCs del módulo: **patrón aceptado** del proyecto (escritura por RPC `SECURITY DEFINER` con autorización interna; idéntico a riesgos y No Conformidades, ya APTO). `search_path = ''` fijado en todas las funciones.

## Condiciones
- Ninguna que bloquee el despliegue. Las ampliaciones futuras del módulo (adjuntos/evidencia de auditoría, notificaciones) deberán auditarse cuando se implementen, igual que la evidencia de archivo de No Conformidades.
