# Auditoría de seguridad — v1.1-2: Encuesta de satisfacción enviable (ISO 9001 9.1.2)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `029_encuesta.sql` (tablas `satisfaction_surveys`/`survey_responses` [respuestas **anónimas**]/`survey_counters`; RLS; RPCs `create_survey`/`close_survey` [authenticated] y **`get_survey_public`/`submit_survey_response` [anon]**; reutiliza `record_satisfaction`), `src/lib/data/queries.ts` (`listSurveys`/`getPublicSurvey`/`listSurveyResponses`), `src/lib/data/actions.ts` (`createSurvey`/`closeSurvey`/`submitSurveyResponse`/`exportSurveyCsv`), `src/components/encuesta/*`, `src/components/pqrs/survey-campaigns.tsx`, `src/app/encuesta/[token]/**`, rate-limit/turnstile.

## Resumen ejecutivo (3 líneas)
El módulo añade un **endpoint público** (responder una encuesta sin sesión) acotado con el patrón de la casa: la escritura pasa por un RPC `SECURITY DEFINER` resuelto **por token**, protegido por **CAPTCHA Turnstile + rate-limit por IP** en la server action, con el puntaje normalizado/validado en el servidor. Las respuestas son **anónimas** (sin PII; `ip_hash` con sal, no reversible) y el público **no puede leer** campañas ni respuestas (sin GRANT a `anon`: la lectura directa da *permission denied*). No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · 0 Bajos. Habilitado para testing y despliegue.

## Verificaciones (sin hallazgos)

### Endpoint público (el foco)
- **Escritura solo por RPC.** `submit_survey_response(p_token, p_raw, p_comment, p_ip_hash)` es `SECURITY DEFINER` (`search_path=''`): resuelve la campaña **por token**, exige `status='abierta'` y `closes_at` vigente, **normaliza** el puntaje a 0–100 según la escala y **valida rango** (rechaza fuera de rango), limita el comentario (≤1000) y guarda `ip_hash`. `anon` tiene `EXECUTE` solo sobre este RPC y sobre `get_survey_public`; **no** tiene GRANT de tabla, así que una lectura/inserción directa por `anon` da *permission denied* (verificado en RLS 029).
- **Defensa en profundidad en la server action.** `submitSurveyResponse` verifica **Turnstile** (`action="encuesta"`) y aplica **rate-limit** (`encuesta:ip` 30/10m, `encuesta:token_ip` 10/1h) **antes** de llamar al RPC; si falta la config de Turnstile, el envío se bloquea (como login). El `ip_hash` se calcula server-side (`sha256Hex(ip|token)`).
- **Anti-enumeración / no fuga de organización.** El token es aleatorio de 64 hex; `get_survey_public` devuelve solo `title/method/scale/is_open` (nunca id ni `organization_id`); un token inexistente devuelve **0 filas** y la página muestra un mensaje **neutro** ("Esta encuesta no está disponible"), igual para inválido y cerrado (verificado). El `organization_id` de la respuesta se deriva del servidor (del token), no del cliente.

### Dato personal (Ley 1581)
- Respuestas **anónimas**: no se pide nombre ni contacto; el formulario advierte "No incluyas datos personales"; el `comment` es libre con tope de longitud. `ip_hash` es un hash con sal (no identificable) usado solo para anti-abuso. `survey_responses` no tiene columnas de PII.

### Aislamiento, autorización y cierre
- `create_survey`/`close_survey` exigen `can_manage_pqrs(org, process)`; `listSurveys`/`getPublicSurvey`/`listSurveyResponses` usan el cliente del usuario (RLS `can_see_pqrs`). Verificado: Sofía (consulta) no crea; Beto (org B) no crea ni cierra ni ve campañas de A. `close_survey` exige ≥1 respuesta y hace **upsert** en `satisfaction_measurements` reutilizando `record_satisfaction` (misma `(org, period, method)`), sin tocar el Módulo 7 ni el Tablero.
- FKs compuestas `(id, organization_id)`; numeración `ENC-AAAA-###` atómica por `survey_counters` (deny-all). `exportSurveyCsv` usa `toCsv` (anti-fórmula) sobre filas ya acotadas por RLS.

### Advisors de Supabase (security)
- `rls_enabled_no_policy` (INFO) incluye ahora `survey_counters` (deny-all intencional).
- **`anon_security_definer_function_executable` (WARN) ×2 = `get_survey_public` y `submit_survey_response`: ESPERADO y por diseño (ADR-039).** Son el endpoint público deliberado, con validación interna por token, estado, escala y anti-abuso; `anon` no tiene ningún otro acceso. `authenticated_security_definer_function_executable` (WARN) = patrón aceptado. **Sin `function_search_path_mutable`** (todas con `search_path=''`).

## Condiciones
- Ninguna que bloquee el despliegue. **Condiciones de ampliación:** si en el futuro se capta el **contacto** del cliente en la encuesta (deja de ser anónima), re-auditar bajo Ley 1581 (consentimiento, minimización, retención); si se añade NPS clásico o cuestionario multi-pregunta (v1.1-5), auditar esos cálculos/campos.
