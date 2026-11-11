# Arquitectura — Salida no conforme (ISO 9001 8.7)

**Producto:** CrubolDocs · **Feature:** v1.3-5a · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 9001 **8.7** exige **identificar y controlar las salidas no conformes** (producto/servicio que no cumple) para evitar su uso o entrega no intencional, y registrar la **disposición** tomada (separar, reproceso, concesión, devolución, desecho, suspender el servicio, informar al cliente). Hoy solo tenemos **No Conformidades/CAPA (10.2)**, que es otra cosa; 8.7 es el control de la **salida**. KAWAK vende "producto no conforme" como módulo propio.
- **Acción de valor:** registrar la salida no conforme, aplicarle una **disposición** y **cerrarla** con evidencia; si es recurrente o grave, **generar una NC** con un clic.
- **Cobro:** incluido. Sin dato personal nuevo (puede referir un cliente por texto; se minimiza).

## 2. Modelo de dominio
Multi-tenant por `organization_id`; patrón RLS solo-SELECT + escritura por RPC. Una entidad nueva + su contador.

### `nonconforming_outputs` — salida no conforme (8.7)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | |
| code | text | `SNC-AAAA-###` (contador atómico `snc_counters`) |
| description | text NOT NULL | la salida no conforme |
| process_id | uuid NULL → processes (id, org) | proceso donde se detectó |
| detected_date | date NOT NULL | |
| identification | text NULL | lote/cantidad/referencia (cómo se identifica/segrega) |
| disposition | text NULL CHECK in (…) | `separar`,`reproceso`,`reclasificar`,`concesion`,`devolucion`,`desecho`,`suspender_servicio` (null hasta tratar) |
| disposition_detail | text NULL | detalle de la disposición |
| customer_informed | boolean NOT NULL default false | se informó / se obtuvo concesión del cliente |
| responsible_position_id | uuid NULL → positions (id, org) | responsable de la disposición |
| nonconformity_id | uuid NULL → nonconformities (id, org) | NC generada (ADR-075) |
| status | text CHECK in ('abierto','tratado','cerrado') default 'abierto' | máquina de estados |
| created_by | uuid default auth.uid() | |
| created_at / updated_at | timestamptz | |

FKs compuestas `(id, organization_id)` a processes/positions/nonconformities; índice `(organization_id, status)`; `snc_counters` deny-all.

### Máquina de estados (ADR-074)
`abierto` → **aplicar disposición** (`set_output_disposition`: fija disposition + detalle + informado, estado → `tratado`) → **cerrar** (`close_output`: exige disposición, estado → `cerrado`). Editar datos permitido mientras no esté `cerrado`.

### Integración con NC (ADR-075)
`generate_nc_from_output` reutiliza `report_nonconformity(source='producto_servicio', severity='mayor')` (la fuente **ya existe** en el enum), enlaza `nonconformity_id`, **idempotente** (`for update` + guard), autorizado por `can_manage` del proceso. Auditoría con `log_event` (entity `SalidaNoConforme`).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Registrar salida no conforme (SNC-AAAA-###) con identificación | **Sí** | Núcleo 8.7 |
| Disposición (enum) + detalle + ¿informado al cliente? | **Sí** | Decisión de Fernando |
| Estados abierto→tratado→cerrado; cerrar exige disposición | **Sí** | Decisión de Fernando |
| Generar NC desde la salida (reusa report_nonconformity) | **Sí** | Decisión de Fernando |
| Exportar CSV + baja/anulación lógica | **Sí** | Paridad |
| Recordatorio por cron de salidas abiertas | No | Se difiere (sin SLA en 8.7) |
| Adjuntos/foto de la salida | No | Diferido (coherente) |

**Camino dorado:** registrar una **salida no conforme** (lote X del proceso Producción) → **aplicar disposición** "reproceso" con detalle e indicar si se informó al cliente → **cerrar**; si se repite, **generar NC** con un clic.

## 4. Mapa de rutas
- **`/app/salidas-no-conformes`** (tablero): resumen (abiertas, tratadas, cerradas) + lista con filtros (estado, disposición, proceso, buscar) + Sheet "Nueva salida". **Ve:** roles del SIG (`canSeeNcOutputs`). **Gestiona:** Líder SIG o Líder del proceso (`canManageNcOutputs`).
- **`/app/salidas-no-conformes/[codigo]`** (ficha): encabezado + stepper (abierto→tratado→cerrado), datos, disposición (Sheet), cierre, y "Generar NC"/enlace a la NC. Solo lectura si no gestiona o está cerrada.
- Ítem de menú "Salidas no conformes" (ícono tipo paquete/bloqueo), junto a No conformidades.

## 5. Integraciones y riesgos
**Servicios externos / dependencias:** **ninguno nuevo.**

**Top 3 riesgos y mitigación:**
1. **Confusión 8.7 vs 10.2** → módulo propio con copy claro; el vínculo a NC es **opcional** y explícito; no se duplica el flujo CAPA.
2. **Cerrar sin disposición** → `close_output` exige `disposition` no nula; estados validados en el servidor.
3. **Cruce de organización al generar NC** → la NC se crea con el `organization_id` **de la salida**, autz por `can_manage` del proceso, idempotente.

## ADRs

### ADR-073 — Módulo propio para 8.7 (separado de 10.2)
**Contexto:** el control de la salida no conforme (8.7) es distinto de la no conformidad + acción correctiva (10.2).
**Decisión:** entidad `nonconforming_outputs` con numeración `SNC-AAAA-###` y su contador; no se mezcla con `nonconformities`.
**Consecuencias:** claridad de auditoría; un vínculo opcional conecta ambos sin acoplarlos.

### ADR-074 — Disposición como enum + estados; cerrar exige disposición
**Contexto:** 8.7 se audita por la disposición tomada y su evidencia.
**Decisión:** `disposition` enum + `disposition_detail` + `customer_informed`; máquina `abierto→tratado→cerrado`; `close_output` exige disposición.
**Consecuencias:** métricas por tipo de disposición; el registro no se cierra sin decisión.

### ADR-075 — Generar NC desde la salida (reusa report_nonconformity)
**Contexto:** una salida recurrente/grave debe escalar a NC (10.2) sin reescribir el motor.
**Decisión:** `generate_nc_from_output` llama `report_nonconformity(source='producto_servicio','mayor')` (fuente ya existente), enlaza y es idempotente.
**Consecuencias:** integración 8.7→10.2 con un clic; sin cambios al enum de fuentes.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (tablero + ficha). Luego backend, seguridad y deploy. Después, **5b SSO/API**.
