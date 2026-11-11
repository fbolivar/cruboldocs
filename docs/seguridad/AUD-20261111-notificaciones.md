# Auditoría de seguridad — Notificaciones Slack/Teams (v1.4-7)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 053 (`chat_notifiers`, `chat_outbox`, `enqueue_chat`, triggers extendidos + `tg_chat_solicitud`, RPCs `create/update/discard_chat_notifier`), entrega (`src/lib/chat/providers.ts` + `deliver.ts`, host allowlist), server actions (`createChatNotifier`/`updateChatNotifier`/`discardChatNotifier`/`testChatNotifier`), UI (Admin → Notificaciones), wiring en cron + `after()`.

## Resumen ejecutivo (3 líneas)
La URL del canal es un **secreto**: `chat_notifiers` solo la ve el Admin (RLS `can_manage_org`), la UI la muestra **enmascarada**, y toda publicación valida la URL contra una **lista blanca de hosts** de Slack/Teams con `https` (anti-SSRF), tanto al guardar como **antes de cada POST**. El mensaje va **sin PII** (solo tipo de evento + code + título recortado), encolado por los triggers `AFTER INSERT` (revocados de todos) y entregado con reintentos/backoff como los webhooks. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| N-01 | Media | Publicar a una URL provista por el usuario podría usarse para SSRF. | `isAllowedChatUrl` exige `https` y host en lista blanca (`hooks.slack.com`, `*.webhook.office.com`, `outlook.office.com`, `*.office.com`); se valida al crear/editar (server action) **y** dentro de `sendChat` antes de cada POST. Unit test cubre hosts internos/ip/http. | Mitigado |
| N-02 | Media | La URL del incoming webhook es un secreto (permite publicar en el canal). | RLS de `chat_notifiers` solo `can_manage_org`; la UI muestra `maskChatUrl` (host + últimos 6); la URL completa solo se usa server-side (prueba/entrega). | Mitigado |
| N-03 | Info | El mensaje podría filtrar datos del cliente. | El encolado guarda solo `event`, `code` y `left(title,120)`; PQRS usa el **tipo** (no la descripción ni el contacto); sin nombre/correo del cliente. | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** `chat_notifiers`/`chat_outbox` con RLS por `organization_id` y `can_manage_org`; `enqueue_chat` encola solo para canales de la misma org suscritos al evento. Pruebas RLS 053: Beto (org B) no configura ni ve canales de A.
- **Autorización:** crear/editar/eliminar exige `can_manage_org` (Admin/Líder SIG); la consulta y otra org son rechazadas; `discard` es baja lógica (`removed_at`).
- **Encolado seguro:** `enqueue_chat`, `tg_chat_solicitud` y los `tg_webhook_*` re-creados están **revocados de public/anon/authenticated** (solo corren como triggers); no se añadió ninguna función `anon`-ejecutable (anon sigue en 6).
- **Suscripción correcta:** solo se encola para canales **habilitados**, no eliminados y suscritos al evento; verificado que un canal de otro evento o desactivado no recibe (pruebas 053).
- **Entrega:** `deliverChat` usa el cliente de servicio (server-only), formatea por proveedor (Slack `{text}`, Teams `MessageCard`), `timeout` 8s, reintentos con backoff exponencial y tope de intentos; corre en el cron (diario + `/api/cron/webhooks`, protegidos por `CRON_SECRET`) y en `after()` de las creaciones.
- **Validación de entrada:** provider y eventos contra lista blanca (constraint + RPC + zod); URL `https`+host; sin `function_search_path_mutable`.

## Conclusión
El módulo se puede desplegar. No hay Críticos ni Altos; los controles anti-SSRF y de secreto (N-01, N-02) quedan mitigados y probados. Cierra el roadmap v1.4.
