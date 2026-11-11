# ADR-039 — Envío público de la encuesta: RPC por token con rate-limit y CAPTCHA

## Contexto
La encuesta se responde **sin sesión** desde `/encuesta/[token]`: es un endpoint público que **escribe** en la base. Eso abre riesgos de spam, flooding, enumeración de tokens e inyección. El proyecto ya tiene rate-limit (Upstash) y CAPTCHA (Turnstile) para los flujos de acceso.

## Decisión
El envío pasa por un RPC `SECURITY DEFINER` **`submit_survey_response(p_token, p_score, p_comment)`** (`search_path=''`) que: resuelve la campaña **por token**, exige estado `abierta` y `closes_at` vigente, **normaliza y acota** el score en el servidor, limita el `comment`, y registra `ip_hash` (SHA-256 con sal). Antes de llamarlo, la server action valida **CAPTCHA Turnstile** y aplica **rate-limit por IP** (Upstash). El público **no puede leer** `survey_responses` ni `satisfaction_surveys` (RLS solo-SELECT para roles SIG); solo inserta vía el RPC (que se otorga de forma controlada). Errores neutros para token inválido/cerrado (no se filtra organización ni existencia). Sin dependencias nuevas.

## Consecuencias
- La superficie pública se reduce a un RPC acotado + CAPTCHA + rate-limit; nada de acceso directo a tablas.
- El token aleatorio de 32+ bytes hace inviable la enumeración; la organización se deriva en el servidor.
- Si Upstash/Turnstile no están configurados en un entorno, el envío se bloquea de forma segura (como en login).
