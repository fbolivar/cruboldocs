# Auditoría de seguridad — API de escritura + Webhooks (v1.4-1)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** 4 endpoints POST + idempotencia + webhooks (endpoints, entregas, firma, triggers).
**Migración:** `supabase/migrations/047_api_write_webhooks.sql` · **Servidor:** `src/lib/api/keys.ts` (auth/idempotencia/errores), `src/lib/api/webhooks.ts` (firma/entrega), `src/app/api/v1/*` (POST), `src/app/api/cron/{diario,webhooks}` · **UI:** `src/components/admin/api-webhooks-panel.tsx` + scopes de escritura.

## Resumen ejecutivo
Escritura por API con **scopes de escritura** y **funciones `api_*` dedicadas** (sin sesión, atribuidas al creador de la key, fijando el `organization_id` de la key); **Idempotency-Key** evita duplicados; webhooks encolados por **triggers AFTER INSERT**, entregados con **firma HMAC-SHA256** y reintentos con backoff. Control crítico: las `api_*` **no aceptan un org del cuerpo** y validan que proceso/indicador referenciados pertenezcan al org de la key. Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado (control crítico) | Escritura sin cruce de organización | Las `api_*` fijan `organization_id` al `org` de la key; validan que `process`/`indicator` referenciados sean del org (prueba: proceso de otra org → "no pertenece"); el endpoint resuelve códigos→ids **dentro del org**. | OK |
| 2 | Verificado | `api_*` no ejecutables por usuarios | `revoke execute ... from public, anon, authenticated`; un usuario autenticado recibe "permission denied"; solo el cliente de servicio (API) las llama. Prueba RLS. | OK |
| 3 | Verificado | Idempotencia | `Idempotency-Key` guarda la respuesta por (org, clave); un reintento devuelve la misma sin duplicar. `api_idempotency` deny-all (solo cliente de servicio). Prueba RLS. | OK |
| 4 | Verificado | Webhooks firmados y autenticados | Cada POST lleva `X-Crubol-Signature: sha256=HMAC(secreto, cuerpo)`; el secreto se muestra una vez y se guarda; URL **https** obligatoria; eventos validados. | OK |
| 5 | Verificado | Entrega robusta y sin bucle | Reintentos con backoff exponencial y tope (6); endpoint revocado → no se encola ni se entrega; evento no suscrito → no se encola. Pruebas RLS. | OK |
| 6 | Verificado | Emisión/control por administración | `create/revoke_webhook_endpoint` exigen `can_manage_org`; consulta y otra org rechazadas; RLS select de endpoints/entregas solo para quien administra. Pruebas RLS. | OK |
| 7 | Verificado | Payload de webhook sin PII | Los triggers construyen payload mínimo (PQRS sin cliente; NC con código/estado/severidad). | OK |
| 8 | Info | Errores de escritura | Reglas de negocio → 422 con mensaje de la RPC; lo demás → 500 genérico (sin filtrar interno). | Aceptado |
| 9 | Info | Advisors | Trigger functions con EXECUTE revocado (anon vuelve a 2); `api_idempotency` deny-all (rls_enabled_no_policy=21); webhooks con política select; `search_path`=0. | OK |

## Diferido sin hueco
- Entrega sub-diaria depende de `after()` (inmediata) + cron diario (reintentos); `GET /api/cron/webhooks` permite un scheduler frecuente si el plan lo habilita. Escritura amplia/edición y reintento manual: diferidos.

## Checklist
- [x] `api_*` sin cruce de org; validan referencias del org — probado
- [x] `api_*` no ejecutables por usuarios (solo servicio)
- [x] Idempotency-Key; tabla deny-all
- [x] Webhooks firmados HMAC; URL https; secreto una vez
- [x] Reintentos con tope; revocado/no suscrito no entrega — probado
- [x] Emisión por Admin/Líder SIG; RLS select restringido
- [x] tsc + lint + 590 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon vuelve a 2, search_path 0)
