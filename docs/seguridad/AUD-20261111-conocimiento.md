# Auditoría de seguridad — Gestión del conocimiento (v1.4-2)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** módulo Conocimiento (ISO 9001 7.1.6).
**Migración:** `supabase/migrations/048_conocimiento.sql` · **Capa de datos:** `queries.ts` (getKnowledgeSummary/listKnowledge/getKnowledgeArticle) + `actions.ts` (create/update/setArchived/createLessonFromNc/createLessonFromAudit/exportKnowledgeCsv) · **UI:** `src/components/conocimiento/*`, `src/app/app/conocimiento/**`, botón en fichas de NC/auditoría.

## Resumen ejecutivo
Base de conocimiento ligera visible para **cualquier miembro activo** (7.1.6 "a disposición") y gestionada por Líder SIG / Líder del proceso, con escritura por RPC `SECURITY DEFINER` (`search_path=''`). "Registrar lección" desde NC/auditoría valida pertenencia a la organización y autorización. Sin dato personal nuevo; sin dependencias nuevas. Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Visibilidad amplia acotada por organización | RLS select = `is_active_member(organization_id)`: la consulta ve el conocimiento de **su** org; Beto (org B) ve 0. Prueba RLS. | OK |
| 2 | Verificado | Escritura solo por gestores | create/update/archive exigen `can_manage_knowledge` (Líder SIG / Líder del proceso); consulta y otra org rechazadas. Prueba RLS. | OK |
| 3 | Verificado | Lección desde NC/auditoría sin cruce de org | `create_article_from_nc`/`from_audit` cargan el registro, exigen `is_active_member` + `can_manage_knowledge`, y escriben con el `organization_id` **del registro** enlazado. Prueba RLS. | OK |
| 4 | Verificado | Validación e integridad | Zod (categoría enum, cotas de texto); la BD revalida la categoría; numeración atómica `KN-AAAA-###` (`kn_counters` deny-all); FKs compuestas; vínculos `on delete set null`. | OK |
| 5 | Info | Sin dato personal / adjuntos | El contenido lo redacta quien gestiona; sin adjuntos en v1; advisor anon=2, `search_path`=0. | Aceptado |

## Checklist
- [x] RLS select por `is_active_member`; escritura por RPC con `can_manage_knowledge`
- [x] Lección desde NC/auditoría sin cruce de org — probado
- [x] Numeración atómica; contador deny-all
- [x] Aislamiento 2 orgs probado
- [x] tsc + lint + 602 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, search_path 0)
