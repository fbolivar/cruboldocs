# Arquitectura — Notificaciones Slack/Teams (v1.4-7)

**Producto:** CrubolDocs · **Feature:** v1.4-7 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** hoy los avisos viven en la bandeja y el correo; los equipos trabajan en Slack/Teams y quieren enterarse ahí de los eventos del SGC. La competencia ofrece integraciones de chat.
- **Acción de valor:** el Admin configura un **canal** (pega la URL de *incoming webhook* de Slack o Teams), elige **qué eventos** avisar, y la app publica un mensaje legible cuando ocurren.
- **Decisiones (Fernando):** (1) **Slack y Teams por incoming webhook** (sin OAuth); (2) eventos **curados de alta señal** (nueva NC, nueva PQRS, nueva salida no conforme, nueva solicitud); (3) configuración en **Admin → Notificaciones**.
- **Dato personal:** el mensaje va **sin PII** (solo tipo de evento + código/título de la entidad), igual que el payload de los webhooks actuales.

## 2. Modelo / técnica
Reusa el patrón de los webhooks (v1.4-1): disparadores `AFTER INSERT` que **encolan** y entrega asíncrona con reintentos.

- **`chat_notifiers`**: `(id, organization_id, provider text check in ('slack','teams'), url text, name text, events text[], enabled bool default true, created_by, created_at, updated_at)`. RLS select **solo Admin/Líder SIG** (`can_manage_org`): la URL permite publicar en el canal (es un secreto).
- **`chat_outbox`**: `(id, organization_id, notifier_id, event text, title text, status in ('pendiente','enviado','fallido') default 'pendiente', attempts int default 0, last_error text, created_at, sent_at)`. RLS select Admin.
- **Encolado:** un helper `enqueue_chat(org, event, code, title)` inserta una fila de outbox por cada `chat_notifiers` **habilitado** cuyo `events` contenga el evento. Los disparadores `AFTER INSERT` ya existentes de **nonconformities / pqrs_cases / nonconforming_outputs** lo llaman; se **agrega** uno nuevo en **approval_requests**. Sin PII: solo code + `left(title, 120)`.
- **Entrega (ADR-101):** módulo `src/lib/chat/deliver.ts` lee el outbox pendiente, **formatea por proveedor** (Slack: `{ text }`; Teams: `MessageCard`), hace POST a la URL, y marca `enviado`/`fallido` con `attempts` y backoff. Se dispara en el **mismo camino que los webhooks**: intento inmediato vía `after()` (donde hoy se vacían los webhooks) + **cron diario** + `GET /api/cron/webhooks`.
- **Seguridad SSRF (ADR-101):** la URL se valida contra una **lista blanca de hosts** (`hooks.slack.com`, `*.webhook.office.com`, `outlook.office.com`) y debe ser `https`; nunca se hace POST a un host arbitrario (evita usar la app como proxy hacia servicios internos).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Canal Slack/Teams por incoming webhook (agregar/activar/eliminar) | **Sí** | Decisión de Fernando |
| Suscripción a eventos: NC, PQRS, salida no conforme, solicitud (nuevas) | **Sí** | Set curado |
| Entrega formateada por proveedor con reintentos/backoff | **Sí** | Núcleo |
| Botón "Probar" (envía un mensaje de prueba) | **Sí** | Verificar la URL sin esperar un evento |
| Validación de host (anti-SSRF) + solo https | **Sí** | Seguridad |
| Apps OAuth de Slack/Teams / elegir canal en la UI | No | Alcance mucho mayor; diferido |
| Mensajes enriquecidos (bloques, botones, hilos) / menciones | No | Un mensaje simple basta en v1 |
| Notificar vencimientos/tareas y eventos de documentos | No | Diferido (se suman eventos luego) |
| Mensajes con datos del cliente (PII) | No | Minimización (igual que webhooks) |

**Camino dorado:** el Admin entra a **Admin → Notificaciones**, agrega un canal de Teams (pega la URL), marca "Nueva no conformidad" y "Nueva PQRS", pulsa **Probar** (llega un mensaje al canal) → cuando alguien registra una NC, el canal recibe "🔔 Nueva no conformidad NC-2026-012 · <título>".

## 4. Mapa de rutas
- **`/app/admin` → pestaña "Notificaciones"** — lista de canales (proveedor, nombre, eventos, activo), **"Agregar canal"** (proveedor + URL + eventos), **Probar**, activar/desactivar, **Eliminar**. Solo Admin de organización / Líder SIG.
- Sin rutas públicas nuevas. La entrega es server-side (cron + `after()`), sin UI propia.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (POST con `fetch`, reusa cron/outbox).

**Top 3 riesgos y mitigación:**
1. **SSRF por URL arbitraria** → lista blanca de hosts de Slack/Teams + solo `https`; se rechaza cualquier otra URL al guardar y antes de cada POST.
2. **Fuga de la URL del canal (secreto)** → RLS solo Admin; en la UI se muestra **enmascarada** (solo el final); nunca se expone a roles no-admin ni en el cliente completo.
3. **PII en el mensaje** → el encolado solo guarda code + título recortado; nunca nombre/contacto del cliente ni cuerpo; `timeout` y reintentos acotados en la entrega.

## ADRs

### ADR-100 — Incoming webhooks (sin OAuth)
**Contexto:** publicar en Slack/Teams con el mínimo de fricción y sin registro de app.
**Decisión:** el Admin pega la URL de *incoming webhook* del canal; la app formatea por proveedor y hace POST. Sin OAuth, sin tokens, sin selección de canal en la UI.
**Consecuencias:** configuración simple y segura; el precio es que no se listan canales ni se mencionan usuarios (diferido).

### ADR-101 — Reusar el camino de entrega de webhooks + anti-SSRF
**Contexto:** ya existe encolado + entrega con reintentos (v1.4-1); exponer POST a URLs es sensible.
**Decisión:** `chat_outbox` + entrega por el mismo cron/`after()`; URL validada contra lista blanca de hosts y `https`.
**Consecuencias:** poca superficie nueva; el proxy saliente queda acotado a Slack/Teams.

### ADR-102 — Configuración solo Admin, mensajes sin PII
**Contexto:** la URL es un secreto y el canal es externo.
**Decisión:** RLS de `chat_notifiers`/`chat_outbox` solo para Admin/Líder SIG; el mensaje lleva solo tipo de evento + code + título recortado.
**Consecuencias:** el secreto y el canal externo quedan controlados; coherente con la minimización de los webhooks.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (pestaña Notificaciones en Admin). Luego backend, seguridad, deploy. Cierra el roadmap v1.4.
