# Auditoría de seguridad — Portal externo (v1.4-3)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 049 (buzón público de PQRS + autoevaluación de proveedor), server actions `setPublicPqrsPortal`/`issueSupplierSelfAssessment`/`markSelfAssessmentReviewed`/`submitPublicPqrs`/`submitSupplierSelfAssessment`, queries `getPqrsPortal`/`getPublicPqrsPortal`/`getPublicSupplierSelfAssessment`, rutas públicas `/pqrs/[token]` y `/proveedor/[token]`, controles internos (PublicPqrsSheet, SupplierSelfAssessmentPanel).

## Resumen ejecutivo (3 líneas)
El portal expone cuatro RPC anónimas validadas por token opaco, con Turnstile + rate-limit por IP y por (token, IP) en la server action, espejando el patrón ya auditado de la encuesta pública (AUD-20261110-encuesta). Cada RPC resuelve la organización **por el token**, nunca por un `org` del cuerpo, e inserta con ese `org`; las dos tablas nuevas tienen RLS activo con política por `organization_id`. El dato personal del cliente es opcional y minimizado; no hay adjuntos. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| P-01 | Info | La superficie `anon` crece de 2 a 6 funciones SECURITY DEFINER (las 4 del portal). | `has_function_privilege('anon', …)` lista solo `get/submit_public_pqrs`, `get/submit_supplier_self_assessment`, `get_survey_public`, `submit_survey_response`. Esperado y documentado (ADR-088). | Aceptado |
| P-02 | Info | `frequency_interval` es ejecutable por `anon`. | Función pura `IMMUTABLE`, sin acceso a tablas, preexistente al portal. Sin riesgo. | Aceptado |
| P-03 | Bajo | Enumeración de tokens de buzón/proveedor por fuerza bruta. | Token de 32–64 hex (acción: `randomBytes(18)`); rate-limit `pqrs_pub:*`/`proveedor:*` por IP y (token, IP) + Turnstile. Espacio de búsqueda inviable. | Mitigado |
| P-04 | Info | El cliente puede dejar nombre/contacto en la PQRS pública. | Campos opcionales, recortados (≤200), sin adjuntos; nota de tratamiento de datos enlazada en el formulario. Minimización igual a PQRS interna. | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** RLS activo en `public_pqrs_portals` (select `can_manage_pqrs`) y `supplier_self_assessments` (select `can_see_suppliers`); FKs compuestas `(id, organization_id)`. Pruebas RLS 049 (21 casos): Beto (org B) no administra el buzón de A, no genera enlaces de proveedores de A, no ve autoevaluaciones de A.
- **Sin `org` del cuerpo:** `submit_public_pqrs`/`submit_supplier_self_assessment` derivan `organization_id` del token; la PQRS pública se crea con `created_by = portal.created_by` (NOT NULL) y `channel='web'`.
- **Autorización de gestión:** `set_public_pqrs_portal`/`issue_supplier_self_assessment`/`mark_self_assessment_reviewed` exigen rol (`can_manage_pqrs`/`can_manage_suppliers`/`can_see_suppliers`); la consulta (Sofía) y la otra organización son rechazadas.
- **Validación de entrada:** tipo PQRS contra lista blanca; descripción ≥3; puntaje 0–100 validado y recortado en servidor; zod/recorte en las server actions; `search_path=''` en todas las funciones (`function_search_path_mutable` = 0).
- **Anti-abuso:** Turnstile (`pqrs_publica`/`proveedor`) + rate-limit por IP y (token, IP) antes de cada RPC pública; IP guardada como hash en la autoevaluación.
- **Fuga por token inválido:** mensajes neutros ("Este formulario no está disponible") en RPC y en las páginas; token inexistente o buzón desactivado no revela existencia.
- **REST directo:** `anon` no lee `public_pqrs_portals` ni `supplier_self_assessments` por REST (permission denied); nadie inserta por REST (RLS).
- **Advisors de Supabase (security):** sin `rls_enabled_no_policy` nuevos con hueco; `anon`/`authenticated security_definer_function_executable` = las esperadas; sin `function_search_path_mutable`.
- **Indexación:** rutas públicas con `robots: { index:false }`.

## Conclusión
El portal externo se puede desplegar. No hay Críticos ni Altos. Los ítems Info/Bajo quedan aceptados o mitigados conforme al diseño aprobado (ADR-088/089/090).
