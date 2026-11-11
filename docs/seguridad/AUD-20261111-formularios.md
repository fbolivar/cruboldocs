# Auditoría de seguridad — v1.1-5: Constructor de formularios

- **Fecha:** 2026-11-11
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `033_formularios.sql` (tablas `form_templates`/`form_fields`/`form_submissions`/`submission_values`/`form_counters`; RLS solo-SELECT; helpers `can_see_forms`/`can_manage_forms`; RPCs de ciclo de vida `create_template`/`update_template_data`/`add_field`/`update_field`/`remove_field`/`set_field_order`/`publish_template`/`new_template_version`/`set_template_archived` + guardas `template_or_fail`/`template_has_open_draft`/`field_template`; RPCs de respuestas `get_published_form`/`get_published_form_by_code`/`validate_submission_values`/`save_submission_draft`/`submit_submission`/`submit_new_submission`), capa de datos (`getFormsSummary`/`listFormTemplates`/`getFormTemplate`/`getPublishedFormByCode`/`listSubmissions`/`getSubmission`/`listSubmissionsForExport`), acciones (`createTemplate`/`updateTemplateData`/`addField`/`updateField`/`removeField`/`setFieldOrder`/`publishTemplate`/`newTemplateVersion`/`setTemplateArchived`/`saveSubmissionDraft`/`submitSubmission`/`submitNewSubmission`/`exportFormCsv`/`fetchSubmission`), `src/components/formularios/*`, `src/app/app/formularios/**`.

## Resumen ejecutivo (3 líneas)
El módulo replica el patrón ya APTO: RLS solo-SELECT por `organization_id`, escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización por rol y FKs compuestas. La **validación de las respuestas es server-side** contra el esquema de la versión (requeridos, tipos, membresía de opciones de selección/multiselección, cotas de número/puntaje, longitud de texto); el **versionado congela** los campos al publicar y clona al crear una nueva versión (ADR-047). El diligenciar es interno (cualquier miembro activo, vía RPC definer); no hay endpoint público ni dato personal nuevo. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **2 Bajos** (aceptados). Habilitado para despliegue.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Plantilla **sin proceso** la gestiona cualquier Líder de proceso (semántica NULL-scope). Actor siempre rol SIG de la **misma** organización; sin cruce. | `can_manage_forms(org, process)` con `process` nulo. Patrón aceptado en todos los módulos. | Asignar proceso; o exigir Líder SIG para las sin proceso. No bloquea. |
| BAJ-02 | Bajo (aceptado) | Un **borrador de respuesta** iniciado contra la versión N y reabierto tras re-publicar (N+1) re-guarda sus valores filtrando por la versión publicada vigente; `submit_submission` valida contra la versión **almacenada** del borrador. Caso límite (editar un borrador que sobrevive a un cambio de versión); solo descarta valores de campos que dejaron de existir. | `save_submission_draft` filtra por `published_version`; `submit_submission` valida contra `s.template_version`. | Fijar la versión del borrador al crearse y validar/guardar siempre contra ella. Sin impacto de seguridad (no cruza org ni eleva rol). |

## Verificaciones (sin hallazgos)
- **Aislamiento/autorización:** las 4 tablas de datos con RLS solo-SELECT (`can_see_forms` = roles SIG); `form_counters` deny-all. Toda escritura por RPC con `can_manage_forms(org, process)`; el diligenciar por `is_active_member`. Verificado (RLS 033, 24 casos): Sofía (consulta) y Beto (org B) no crean plantillas; Beto no ve plantillas de A; inserción directa por REST bloqueada; `form_counters` deny-all. FKs compuestas `(id, organization_id)` en `form_fields`/`form_submissions`/`submission_values` → nada se liga a otra organización.
- **Validación server-side de respuestas (ADR-046):** `validate_submission_values` recorre los campos activos de la versión y exige requeridos, tipo correcto (texto/número/fecha/booleano), **pertenencia de la opción** al catálogo (selección/multiselección) y cotas min/max (número y puntaje, con 0–100 por defecto). Verificado: requerido faltante, opción fuera del catálogo y número sobre el máximo → rechazados; respuesta válida → `enviada`. La función de validación **no** es ejecutable por `public/anon/authenticated` (solo interna).
- **Versionado (ADR-047):** `publish_template` congela la versión y exige ≥1 campo de dato; una publicada es inmutable (`add_field` → "crea una nueva versión"); `new_template_version` clona los campos activos a un `draft_version=N+1` sin tocar lo publicado ni las respuestas ya recolectadas. Verificado end-to-end.
- **Propiedad del borrador:** `save_submission_draft` solo deja editar un borrador propio (`submitted_by = auth.uid()`) y en estado `borrador`; un tercero recibe "Respuesta no encontrada" (verificado). El `delete` interno de `submission_values` está acotado al propio `submission_id` del autor (no es hard-delete de negocio; baja lógica en `form_fields` vía `is_active`).
- **Resolución pública por código:** `get_published_form_by_code(org, code)` valida `is_active_member(org)` y resuelve el código **dentro** de esa organización antes de delegar en `get_published_form`; permite diligenciar sin exponer la RLS de `form_templates`. No ejecutable por `anon`.
- **Capa de datos/CSV:** `queries.ts` usa el cliente del usuario (RLS), sin admin/service_role; `exportFormCsv` arma una fila por respuesta **enviada** con `toCsv` (anti-fórmula) y columnas = etiquetas de los campos. `fetchSubmission` valida UUID y delega en la query con RLS.
- **Validación de entrada/dependencias:** zod en las acciones (enums de categoría/tipo, longitudes, UUIDs, `options`/`config`); `guard/ok/fail`; `dbMessage` oculta errores crudos de Postgres. Sin dependencias nuevas. Sin dato personal (las plantillas son estructura; las respuestas internas guardan `submitted_by` = usuario con sesión).

## Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) incluye ahora `form_counters` (deny-all intencional).
- `authenticated_security_definer_function_executable` (WARN): patrón aceptado. **`anon_security_definer_function_executable` sigue en 2** (solo las RPC públicas de la encuesta); las funciones de este módulo **no** son ejecutables por `anon`. **Sin `function_search_path_mutable`**.

## Condiciones
- Ninguna que bloquee el despliegue. **Ampliación:** diligenciamiento público por link con token (v1.1-5b) y acciones derivadas (p. ej. una respuesta → hallazgo/NC) se auditarán al implementarse; conviene fijar la versión del borrador al crearse (BAJ-02).
