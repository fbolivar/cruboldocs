# Arquitectura — Módulo 7: PQRS y satisfacción del cliente (ISO 9001 9.1.2)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: M. Dos subdominios: gestión de **PQRS** (casos del cliente) y **satisfacción** del cliente. Entrada a la Revisión por la dirección (9.3).

## 1. Negocio

- **Problema y para quién.** 9.1.2 exige hacer seguimiento a la **percepción del cliente** (satisfacción) y 8.2/10.2 atender sus **quejas y reclamos** con respuesta y plazo. Hoy CrubolDocs no registra PQRS ni satisfacción; el SIG lo lleva en correo/hojas de cálculo. Lo usa el **Líder SIG** (y el **Líder del proceso** dueño del caso); el resto de roles del SIG consulta.
- **Acción de valor principal.** Registrar una **PQRS**, gestionarla hasta su respuesta y cierre dentro del **plazo**, y —cuando es un **reclamo**— convertirla en **No Conformidad** con un clic; más un panel de **satisfacción** periódica que alimenta la revisión por la dirección.
- **Cobro.** Sin cobro por módulo; plan único de v1.
- **Mercado.** Colombia/B2B; PQRS clásico (petición/queja/reclamo/sugerencia/felicitación). El dato del cliente (nombre, contacto) es **dato personal (Ley 1581)** → RLS estricto y minimización.

## 2. Modelo de dominio

Reutiliza `organizations`/`processes`/`positions`/`nonconformities`. Multi-tenant por `organization_id`, FKs compuestas `(id, organization_id)`, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de los módulos 1–6).

### Entidades nuevas (MVP)

1. **`pqrs_cases`** — caso del cliente. **Dato personal.**
   `id, organization_id, code (PQRS-AAAA-###), type ('peticion'|'queja'|'reclamo'|'sugerencia'|'felicitacion'), channel ('correo'|'telefono'|'web'|'presencial'|'otro'), customer_name text null, customer_contact text null, process_id? , description text, received_date date, due_date date, status ('recibida'|'en_gestion'|'resuelta'|'cerrada'|'anulada') default 'recibida', responsible_position_id? , response text null, satisfied boolean null (conformidad del cliente al cerrar), nonconformity_id? →nonconformities(id,org) (si se generó NC), created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`. **Datos personales:** `customer_name`, `customer_contact` (minimizar; solo lo necesario para responder).

2. **`satisfaction_measurements`** — medición periódica de satisfacción (9.1.2). **No** es dato personal (agregado).
   `id, organization_id, period date (mes/periodo), method ('encuesta'|'nps'|'csat'|'otro'), score numeric(5,2) (normalizado 0–100), responses int null, note text null, measured_by, created_at`. `unique(organization_id, period, method)` (una medición por periodo y método). El `score` se **normaliza/valida en el servidor** (0–100).

3. **`pqrs_counters`** — contador atómico `PQRS-AAAA-###` por organización y año (patrón `nc_counters`, RLS deny-all).

### Relaciones (texto)

- `pqrs_cases N—1 processes` (proceso dueño, opcional) y `N—1 organizations`.
- `pqrs_cases 0..1—1 nonconformities` (un reclamo puede generar **una** NC; enlace idempotente).
- `satisfaction_measurements N—1 organizations` (independiente de las PQRS; alimenta la revisión).
- Resúmenes del tablero (abiertas, vencidas, satisfacción del último periodo) son **derivados**.

### Datos sensibles

`pqrs_cases` contiene **dato personal del cliente** → RLS por `organization_id` (solo roles del SIG), minimización de campos, `log_event` en cada mutación (entidad `PQRS`). Sin adjuntos en v1 (ADR-031).

## 3. Alcance del MVP

| Feature | ¿v1? | Justificación |
|---|---|---|
| Registrar PQRS (tipo, canal, cliente, proceso, descripción, fecha) con `PQRS-AAAA-###` | **Sí** | Base del módulo. |
| Plazo/SLA (`due_date` = recepción + N días, editable; **15 días** por defecto) | **Sí** | 8.2/9.1.2 exigen respuesta oportuna. |
| Flujo recibida → en gestión → resuelta → cerrada (+ anulada), con responsable | **Sí** | Ciclo de atención. |
| Registrar **respuesta** y **cierre** con conformidad del cliente (`satisfied`) | **Sí** | Evidencia de atención y de percepción. |
| **Reclamo → No Conformidad** con un clic (idempotente) | **Sí** | `nonconformities.source` ya tiene `queja_pqrs`; reusa `report_nonconformity`; cierra el lazo 9.1.2→10.2 **sin cambios de esquema** (ADR-030). |
| Recordatorio de **PQRS por vencer/vencida** (tarea + cron) | **Sí** | Reutiliza el cron; barato. |
| **Satisfacción** periódica (`satisfaction_measurements`) + panel resumen | **Sí** | 9.1.2 núcleo; simple, alimenta la revisión. |
| Tablero con filtros (tipo, estado, vencimiento, proceso) + exportación CSV | **Sí** | Consulta y evidencia. |
| Estados/SLA/plazos **configurables** por organización | **No** | Fijos con default 15 días en v1; configurar = ampliación. |
| Indicador "índice de satisfacción" en el módulo Indicadores | **No (diferido)** | Derivable; se conecta a Indicadores después. |
| Snapshot de la Revisión lee la satisfacción automáticamente | **No (diferido)** | Hoy la satisfacción del cliente es **entrada de texto** del acta (ADR-016). |
| **Adjuntos/soportes** de la PQRS en Storage | **No (diferido)** | Acota la superficie; se añade con el patrón endurecido server-only (ADR-031). |
| Motor de encuestas (formularios, envío masivo, portal del cliente) | **No** | Otro producto; fuera de 9.1.2. |
| Clasificación/redacción de PQRS por el agente IA | **No** | Dato personal del cliente → re-auditoría de privacidad; solo ROADMAP. |

**Camino dorado:** Líder SIG (o Líder del proceso) **registra una PQRS** (tipo, canal, cliente, descripción) → el sistema fija el **plazo** (recepción + 15 días) → se **asigna** a un proceso/responsable y pasa a *en gestión* → se registra la **respuesta** → si es un **reclamo**, se **genera la NC** con un clic → se **cierra** indicando si el cliente quedó conforme. En paralelo, el SIG registra la **satisfacción** del periodo, que aparece resumida en el tablero y se lleva a la revisión por la dirección.

Cabe en 2 pantallas (tablero con panel de satisfacción + ficha) con Sheets.

## 4. Mapa de rutas

Bajo `/app` (middleware ya protege). Ver = roles del SIG; gestionar (registrar/editar/gestionar/cerrar/anular, registrar satisfacción, generar NC) = Líder SIG o Líder del proceso del caso.

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/pqrs` | Tablero: tarjetas resumen (abiertas, **vencidas**, satisfacción del último periodo); lista con `código`, tipo (chip), cliente, estado (badge), vencimiento (realce si vencida); filtros tipo/estado/vencimiento/proceso/buscar; **panel de Satisfacción** (últimas mediciones + Sheet "Registrar satisfacción"); Sheet "Nueva PQRS"; exportar CSV. | Ver: roles SIG. Gestión: Líder SIG / Líder del proceso. |
| `/app/pqrs/[codigo]` | Ficha: datos de la PQRS y del cliente (editar); gestión (asignar, cambiar estado); **respuesta**; **cierre** con conformidad; botón **"Generar NC"**/enlace si es reclamo; trazabilidad (`NcTimeline`). | Ídem; la gestión según rol. |

## 5. Integraciones y riesgos

**Integraciones (reutilizadas, sin dependencias nuevas):** tareas+cron/correo (recordatorio de vencimiento del plazo), `log_event`, exportación CSV, y **No Conformidades** (`report_nonconformity` con `source='queja_pqrs'`, ya existente). Diferidos: indicador de satisfacción, lectura por el snapshot de la revisión, adjuntos en Storage.

**Top 3 riesgos y mitigación:**
1. **Dato personal del cliente (Ley 1581).** → RLS estricto por `organization_id` (solo roles del SIG), minimización de campos (solo nombre y un contacto), `log_event`, sin adjuntos en v1. Auditoría de seguridad obligatoria antes del deploy; prueba de aislamiento con 2 organizaciones.
2. **Integridad del reclamo→NC** (que no cruce organización ni duplique). → `report_nonconformity` con el `org` del caso ya validado; enlace idempotente con `for update` (patrón hallazgo→NC / medición→NC). Prueba de idempotencia y de que solo un **reclamo** la genera.
3. **Inflado hacia un CRM/motor de encuestas.** → Alcance cortado a registro+gestión+respuesta+cierre y a una medición de satisfacción simple; lo demás al ROADMAP.

## Decisiones (ADR)
- **ADR-028** — Escritura por RPC `SECURITY DEFINER` y visibilidad (gestión Líder SIG o Líder del proceso; ver roles SIG); numeración `PQRS-AAAA-###` con contador atómico.
- **ADR-029** — Satisfacción = **registro periódico simple** (`satisfaction_measurements`, score normalizado 0–100 en el servidor), no un motor de encuestas; independiente de las PQRS.
- **ADR-030** — **Reclamo → NC con un clic en v1**, reutilizando `report_nonconformity(source='queja_pqrs')` (ya en el enum), idempotente; SLA con recordatorio por tarea+cron.
- **ADR-031** — Dato personal del cliente: minimización + RLS; **adjuntos en Storage diferidos** (sin bucket ni columnas de archivo en v1).

## Checklist de salida
- [x] Multi-tenant (org + membership + rol) reutilizado.
- [x] MVP en 2 pantallas.
- [x] Camino dorado de punta a punta.
- [x] Riesgos con mitigación.
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
