# Arquitectura — v1.1-2: Encuesta de satisfacción enviable (ISO 9001 9.1.2)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: M. Cierra el ciclo de 9.1.2: hoy se **registra el resultado** de la satisfacción a mano; esto permite **recolectarla** con un link público y que el promedio **alimente la medición** que ya leen el Módulo 7 y el Tablero.

## 1. Negocio

- **Problema y para quién.** El SIG necesita **medir** la satisfacción del cliente, no solo teclear un número. Hoy no hay forma de enviar una encuesta y recibir respuestas. Lo usa el **Líder SIG / Líder de proceso** (crea y cierra campañas) y el **cliente final** (responde sin cuenta).
- **Acción de valor principal.** Crear una **campaña de encuesta** (periodo + método), compartir su **link público**, recibir respuestas anónimas, y al **cerrar** la campaña el promedio se vuelve una **medición de satisfacción** del Módulo 7 (que el Tablero ya grafica).
- **Cobro.** Sin cobro por módulo; plan único.
- **Mercado.** Colombia/B2B. Las respuestas son **anónimas por defecto** (sin dato personal); si se pidiera contacto, sería dato personal (Ley 1581) → se deja fuera del MVP.

## 2. Modelo de dominio

Reutiliza `organizations`/`processes` y, sobre todo, la tabla **`satisfaction_measurements`** del Módulo 7 (no se duplica el resultado). Multi-tenant por `organization_id`, FKs compuestas, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de los módulos).

1. **`satisfaction_surveys`** — campaña de encuesta. `id, organization_id, code (ENC-AAAA-###), title, method ('encuesta'|'nps'|'csat'), period date (mes al que imputa), process_id?, token text unique (aleatorio, 32+ bytes, como invitaciones), status ('abierta'|'cerrada') default 'abierta', scale ('0_100'|'1_5'|'nps_0_10') default '0_100', closes_at timestamptz?, created_by/at, closed_at?`. `unique(organization_id, code)`, `unique(id, organization_id)`, `unique(token)`.
2. **`survey_responses`** — respuesta anónima. `id, organization_id, survey_id→satisfaction_surveys(id,org), score numeric(5,2) (normalizado 0–100 en el servidor según la escala), comment text? (libre, sin pedir identidad), ip_hash text? (SHA-256 de IP+salt, solo anti-abuso, no es dato personal), created_at`. `unique(id, organization_id)`. **Sin** nombre/correo del cliente (anónima).
3. **`survey_counters`** — contador atómico `ENC-AAAA-###` (patrón, deny-all).

### Relaciones / flujo
- `satisfaction_surveys 1—N survey_responses`.
- Al **cerrar** la campaña (o en vivo), el promedio de `survey_responses.score` + el conteo se escriben como una fila de **`satisfaction_measurements`** (misma `(org, period, method)`; reutiliza el upsert existente) → el panel de PQRS y el Tablero la muestran sin cambios.

### Datos sensibles
- **Respuestas anónimas**: no se recoge identidad. `comment` es texto libre (se advierte "no incluyas datos personales"). `ip_hash` es un hash con sal (no reversible, solo para limitar abuso) → no es dato personal identificable. El `token` es un secreto de acceso al formulario, no a datos.

## 3. Alcance del MVP (cortado agresivo)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Crear **campaña** (`ENC-AAAA-###`, título, método, periodo, escala, proceso) con **link público** | **Sí** | Núcleo del feature. |
| Página **pública** `/encuesta/[token]` (sin sesión): 1 pregunta de puntaje (según escala) + comentario opcional + enviar + gracias | **Sí** | La acción del cliente; mínima. |
| **Anti-abuso** en el envío: rate-limit por IP (Upstash ya existe) + CAPTCHA Turnstile (ya existe) | **Sí** | Endpoint público escribe en BD → obligatorio. ADR-039. |
| **Cerrar** campaña → escribe/actualiza la `satisfaction_measurement` (promedio + nº de respuestas) | **Sí** | Conecta con 9.1.2 ya construido. ADR-040. |
| Gestión en el panel de **PQRS/satisfacción**: crear campaña, copiar link, ver nº de respuestas y promedio en vivo, cerrar; listado de campañas | **Sí** | Reutiliza la vista existente; sin ruta nueva en `/app`. |
| **Varias preguntas / cuestionario configurable** | **No** | Eso es el Constructor de formularios (v1.1-5); aquí 1 puntaje + comentario. |
| **Pedir identidad/contacto** del cliente | **No** | Evita dato personal; anónima en v1. |
| **NPS con cálculo de −100..100** (promotores−detractores) | **No (diferido)** | El MVP normaliza a 0–100; el cálculo NPS clásico se añade luego. |
| Recordatorios/envío de correo masivo a clientes | **No** | Se comparte el link (correo, WhatsApp, QR); no gestionamos lista de correos de clientes. |
| Editar respuestas / ver respuesta individual con PII | **No** | Anónimas; solo agregados + comentarios. |

**Camino dorado:** el Líder SIG crea una **campaña** (método CSAT, periodo nov-2026, escala 0–100) → copia el **link** y lo comparte → los clientes responden en `/encuesta/[token]` (puntaje + comentario, con CAPTCHA) → el panel muestra **nº de respuestas y promedio en vivo** → al cerrar, el promedio queda como **medición de satisfacción** de noviembre (visible en PQRS y en el Tablero).

Pantallas: **1 pública** (`/encuesta/[token]`) + se **extiende** el panel de satisfacción existente (Sheets de crear/cerrar). No añade ruta en `/app`.

## 4. Mapa de rutas

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/encuesta/[token]` | **Pública, sin sesión.** Formulario: puntaje (según escala) + comentario opcional + CAPTCHA + "Enviar"; luego "Gracias". Si el token no existe o la campaña está cerrada: mensaje neutro (sin filtrar nada). | Cualquiera con el link (el cliente). |
| `/app/pqrs` (panel de satisfacción, **extendido**) | Campañas: crear (genera link), copiar link, nº de respuestas + promedio en vivo, cerrar; además de las mediciones ya existentes. | Ver/gestionar: roles del SIG (`can_see_pqrs`/`can_manage_pqrs`). |

## 5. Integraciones y riesgos

**Integraciones (reutilizadas):** `satisfaction_measurements` + `record_satisfaction` (Módulo 7), rate-limit Upstash y Turnstile (acceso), `toCsv` (exportar respuestas/ comentarios), `log_event`. Sin dependencias nuevas. Sin correo masivo.

**Top 3 riesgos y mitigación:**
1. **Endpoint público de escritura (abuso/spam/inyección).** → El envío pasa por un RPC `SECURITY DEFINER` (`submit_survey_response(token, score, comment)`) que valida token + estado `abierta` + `closes_at`; **rate-limit por IP** (Upstash) y **CAPTCHA Turnstile** antes de aceptar; `score` normalizado y acotado en el servidor; `comment` con longitud máxima y `toCsv` anti-fórmula al exportar; el cliente **anónimo** solo puede **insertar** por el RPC, nunca leer (RLS solo-SELECT para roles SIG; `survey_responses` sin lectura pública). ADR-039.
2. **Fuga entre organizaciones / enumeración de tokens.** → El `token` es aleatorio de 32+ bytes (como invitaciones); el RPC resuelve la campaña **por token** y deriva el `organization_id` del servidor; nunca se expone id/organización en la URL ni en los errores (mensaje neutro para token inválido/cerrado). RLS por `organization_id` en ambas tablas.
3. **Dato personal inadvertido en comentarios.** → La encuesta es **anónima**; se avisa "no incluyas datos personales"; no se pide identidad; `ip_hash` es hash con sal (no identificable). Si el futuro pide contacto, se re-audita (Ley 1581).

## Decisiones (ADR)
- **ADR-038** — Modelo: `satisfaction_surveys` + `survey_responses` (anónimas) + contador `ENC-AAAA-###`; **reutiliza `satisfaction_measurements`** del Módulo 7 para el resultado (no se duplica).
- **ADR-039** — Envío público seguro: RPC `SECURITY DEFINER` por **token**, **rate-limit (Upstash) + Turnstile**, `score`/`comment` validados en servidor, respuestas **no legibles** por el público; sin dependencias nuevas.
- **ADR-040** — Cierre de campaña → **upsert** en `satisfaction_measurements` (promedio + nº de respuestas) por `(org, period, method)`: conecta con 9.1.2 y con el Tablero sin tocarlos.

## Checklist de salida
- [x] Multi-tenant (org + RLS) reutilizado; respuestas anónimas sin PII.
- [x] MVP en 1 pantalla pública + extensión del panel existente.
- [x] Camino dorado de punta a punta (crear → compartir → responder → cerrar → medición).
- [x] Riesgos con mitigación (endpoint público, enumeración, dato personal).
- [ ] **Fernando aprueba el alcance antes de pasar a diseño** (en especial: respuestas **anónimas**, anti-abuso con **Turnstile+rate-limit**, y **1 pregunta** —no cuestionario, eso es #5).
