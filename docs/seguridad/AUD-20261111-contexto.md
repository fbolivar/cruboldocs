# Auditoría de seguridad — Contexto de la organización (v1.3-1)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** módulo Contexto (ISO 9001 4.1/4.2).
**Migración:** `supabase/migrations/041_contexto.sql` · **Capa de datos:** `queries.ts` (getContextSummary/listContextIssues/listInterestedParties) + `actions.ts` (createContextIssue/updateContextIssue/setIssueArchived/generateRiskFromIssue/createInterestedParty/updateInterestedParty/setPartyArchived/exportContextIssuesCsv/exportInterestedPartiesCsv) · **UI:** `src/components/contexto/*`, `src/app/app/contexto/**`.

## Resumen ejecutivo
Módulo de contexto (DOFA + PESTEL) y partes interesadas, conectado al SGC (generar riesgo, ligar a objetivo/requisito legal). Espejo de los módulos previos (todos APTO): RLS solo-SELECT por `organization_id` + escritura por RPC `SECURITY DEFINER` con `search_path=''` y autorización interna por rol. El cruce de org en la generación de riesgos está acotado por `can_manage_risk` del proceso y por el `organization_id` de la propia cuestión. Sin críticos ni altos abiertos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Aislamiento multi-tenant | Beto (org B) no ve ni registra cuestiones/partes de A; FKs compuestas `(id, organization_id)` para proceso; RLS SELECT por `can_see_context`. Pruebas RLS. | OK |
| 2 | Verificado (control clave) | `generate_risk_from_issue` no cruza organización ni salta permisos | El riesgo se crea con el `organization_id` **de la cuestión** (no de un parámetro), autoriza por `can_manage_risk(org, proceso)`, es **idempotente** (`for update` + guard `risk_id`), y reusa `create_risk`. Consulta rechazada ("no puede identificar"); segunda llamada rechazada. Pruebas RLS. | OK |
| 3 | Verificado | Autorización por rol en toda mutación | Crear/editar/archivar = Líder SIG o Líder del proceso (`can_manage_context`); consulta y otra org rechazadas. Pruebas RLS. | OK |
| 4 | Verificado | Integridad de la clasificación | `check` en BD: PESTEL solo en externas (`context_pestel_externa`), y el servidor **anula** PESTEL en cuestiones internas (no confía en el cliente). Prueba RLS. | OK |
| 5 | Info | RPCs `SECURITY DEFINER` ejecutables por `authenticated` | Advisor `authenticated_security_definer_function_executable` (patrón del proyecto); **ninguna** RPC de contexto es ejecutable por `anon` (advisor anon sigue en 2: solo encuesta pública). | Aceptado |
| 6 | Verificado | Dato personal (contacto de la parte, Ley 1581) | Minimizado: `name` + campos opcionales; aviso en la UI; sin adjuntos; visible solo a roles del SIG por RLS. | OK |
| 7 | Verificado | Validación de entrada y vínculos huérfanos | Zod en server actions (enums DOFA/PESTEL/tipo, uuids, cotas de texto); FKs opcionales `on delete set null` para riesgo/objetivo/requisito legal (degradan con gracia); CSV por `toCsv`. `dbMessage` evita fuga de errores. | OK |

## search_path / secretos
- `function_search_path_mutable` = **0**.
- Sin secretos; sin bucket ni columnas de archivo; sin dependencias nuevas; sin IA.

## Checklist
- [x] RLS activo en context_issues/interested_parties con política por organización
- [x] Escritura solo por RPC definer con autz por rol
- [x] generate_risk_from_issue sin cruce de org, idempotente — probado
- [x] PESTEL coherente (solo externas, forzado en servidor) — probado
- [x] Aislamiento 2 orgs probado
- [x] tsc + lint + 519 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, baseline)
