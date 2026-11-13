# Arquitectura — Gestión de incidentes/accidentes SST (v1.6-2)

**Producto:** CrubolDocs · **Feature:** v1.6-2 · **Fecha:** 2026-11-13 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 45001 (10.2) y el SG-SST colombiano (Dec. 1072, Res. 1401/2007) exigen **reportar e investigar** accidentes, incidentes y casi-accidentes de trabajo, hallar la **causa raíz** y definir un **plan de acción**. Hoy la app tiene el SG-SST por estándares (0312) y la matriz de peligros, pero **no** un registro de ocurrencias con investigación. Es una brecha real frente al mercado eQMS 2026.
- **Acción de valor:** cualquier miembro **reporta** una ocurrencia (qué pasó, a quién, dónde, cuándo); el responsable SST la **investiga** (causa raíz con 5 Porqués/Ishikawa) y define **acciones** con responsable y plazo; se **cierra** con trazabilidad y tareas.
- **Reutiliza el motor existente:** la investigación (causa raíz estructurada + plan de acción) **no se reinventa**: la ocurrencia genera una **No Conformidad** (origen `incidente_sst`) con un clic, y allí viven el RCA (v1.5-2) y las acciones CAPA (nc_actions + tareas + cron) que ya están auditados en producción. El registro de incidente es el **frente SST** (clasificación legal + datos del trabajador); la profundidad de la investigación la aporta la NC.
- **Dato personal SENSIBLE:** el trabajador afectado y la naturaleza de la lesión son **dato de salud** (Ley 1581, dato sensible). Se **minimiza** (nombre + cargo; documento opcional) y se restringe por RLS a roles SST. No se guardan historias clínicas ni diagnósticos médicos.

## 2. Modelo / técnica
- **`incidents`** (ocurrencia): `(id, organization_id, code 'INC-AAAA-###', kind text check in ('accidente','incidente','casi_accidente'), occurred_at timestamptz, location text, process_id null→processes(id,org), hazard_id null→hazards(id,org), description text, immediate_action text null, severity text check in ('leve','grave','mortal','sin_lesion') default 'sin_lesion', affected_name text null, affected_document text null, affected_position_id null→positions(id,org), injury text null, body_part text null, lost_days int null, status text check in ('reportado','en_investigacion','cerrado','anulado') default 'reportado', investigated_by_position_id null→positions(id,org), investigation_due date null, investigated_at timestamptz null, closed_at timestamptz null, nonconformity_id null→nonconformities(id,org), created_by, created_at, updated_at; unique(org, code); unique(id, org))`. FKs **compuestas** `(id, organization_id)` a processes/positions/hazards/nonconformities. Contador `inc_counters` deny-all. RLS select `can_see_sst(org)` (mismo gate que SG-SST). Campos del trabajador = **dato sensible** (mínimos).
- **Investigación = NC reutilizada.** No hay tabla de acciones nueva ni de RCA nueva:
  - **Causa raíz:** el RCA `rca_analyses` (5 Porqués/Ishikawa) ya cuelga de la NC generada → se usa tal cual.
  - **Plan de acción:** `nc_actions` (corrección/correctiva/preventiva, responsable, plazo, evidencia, tareas, cron de vencidas) ya existente.
  - El incidente guarda `nonconformity_id` y muestra en su ficha el estado de la NC y sus acciones (enlace), sin duplicar el flujo CAPA.
- **RPC gestión (definer, `search_path=''`, autz `can_manage_sst(org)` = Líder SIG o Líder de proceso; `log_event` entity `Incidente`):**
  - `report_incident(org, kind, occurred_at, location, process, hazard, description, immediate_action, severity, affected_name, affected_document, affected_position, injury, body_part, lost_days)` → `INC-AAAA-###`, estado `reportado`; si `kind='accidente'` fija `investigation_due = occurred_at + 15 días` (Res. 1401). **Reportar lo puede hacer cualquier miembro activo** (cultura de reporte; ver ADR-119), gestionar/investigar/cerrar exige `can_manage_sst`.
  - `update_incident(...)` / `set_incident_investigation(incident, investigated_by, investigated_at)` → pasa a `en_investigacion`. `can_manage_sst`.
  - `generate_nc_from_incident(incident)` → `report_nonconformity(org, 'incidente_sst', process, left(description,110), description, severidad→gravedad)`; enlaza `nonconformity_id`; **idempotente** (`for update`, solo si nulo). Desde aquí se usa RCA + acciones de la NC.
  - `close_incident(incident)` → exige investigación registrada; para `accidente` exige **NC generada** (investigación obligatoria por ley); estado `cerrado`. `can_manage_sst`.
  - `cancel_incident(incident, reason)` → `anulado` (baja lógica, sin hard delete). `can_manage_sst`.
  - `incident_or_fail` espejo de `nc_or_fail`.
- **Nuevo origen de NC:** extender el `check` de `nonconformities.source` con `'incidente_sst'` (DROP/ADD CONSTRAINT en su fragmento; patrón de los módulos previos). No es un `enum` de PG.
- **Recordatorio (ADR-120):** `run_daily_jobs` crea una tarea `investigar_incidente` para accidentes abiertos con `investigation_due` vencida, asignada al `investigated_by_position_id` o al líder del proceso; idempotente (reusa tasks+cron, como proveedores/PQRS).

## 3. Alcance del MVP
| Feature | ¿v1.6-2? | Justificación |
|---|---|---|
| Reporte de accidente / incidente / casi-accidente | **Sí** | Núcleo 45001/SG-SST |
| Clasificación (tipo, severidad, trabajador mínimo, lesión, días perdidos) | **Sí** | Exigido por el SG-SST |
| Investigación con causa raíz 5 Porqués/Ishikawa | **Sí (reusa RCA de la NC)** | Decisión de Fernando; cero tablas nuevas |
| Plan de acción con responsable/plazo/tareas | **Sí (reusa nc_actions)** | Cierra el ciclo 10.2 |
| Incidente → generar NC con un clic (origen `incidente_sst`) | **Sí** | Puente a CAPA, no duplica |
| Plazo legal de investigación 15 días (accidente) + recordatorio | **Sí** | Res. 1401; reusa cron |
| Enlace opcional a peligro (hazards) y proceso | **Sí** | Barato, cierra trazabilidad peligro→incidente |
| Reporte FURAT/formato ARL oficial | No | Diferido (export/plantilla futura) |
| Equipo investigador (varias personas) | No | En v1 un cargo investigador; multi-persona diferido |
| Enfermedad laboral (proceso distinto, crónico) | No | Diferido; el MVP cubre ocurrencias agudas |
| Costos del accidente / días de incapacidad detallados | No | Solo `lost_days`; costos diferidos |
| Adjuntos/fotos de la investigación | No | Diferido (patrón de los últimos módulos) |
| Notificación a la ARL / reporte externo | No | Fuera de alcance v1 |

**Camino dorado:** un operario reporta un **casi-accidente** (resbalón en zona húmeda, sin lesión) → el responsable SST lo clasifica, lo liga al peligro "piso húmedo", pulsa **"Generar NC"**, hace el **5 Porqués** en la NC (falta de señalización), define una **acción** (señalizar + responsable + plazo, que genera tarea), y **cierra** el incidente. Para un **accidente**, el sistema fija el vencimiento de investigación a 15 días y recuerda si se pasa.

## 4. Mapa de rutas
- **`/app/incidentes`** — tablero: 3 StatCard (abiertos, accidentes, investigaciones vencidas) + lista con filtros (tipo, severidad, estado, proceso, buscar) y **"Reportar incidente"**. Visible a roles SST (`can_see_sst` → RISK_ROLES).
- **`/app/incidentes/[codigo]`** — ficha: encabezado (código, tipo, severidad, estado, fecha/lugar), datos del trabajador (**dato sensible**, solo lectura minimizada), investigación (asignar investigador/fecha; plazo con realce si vencido), **No Conformidad** (botón "Generar NC" o enlace a la NC con su RCA y acciones), cierre/anulación según estado y rol, trazabilidad (`NcTimeline`).
- Nav **Incidentes SST** (ícono tipo `ShieldAlert`/`Siren`; gate `canSeeSst`/`canSeeIncidents`). Reportar abierto a cualquier miembro activo; gestionar según `canManageSst`.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Dato de salud del trabajador (Ley 1581, sensible)** → minimización (nombre + cargo; documento opcional), RLS estricto `can_see_sst` por `organization_id`, sin diagnóstico clínico; la lista/CSV no filtran datos de otra org (toCsv anti-fórmula); auditoría de seguridad enfocada en este punto antes del deploy.
2. **Aislamiento entre organizaciones** → RLS por `organization_id`, FKs compuestas `(id, org)`, escritura por RPC `security definer` con `can_manage_sst`; `inc_counters` deny-all; `generate_nc_from_incident` valida el org del incidente.
3. **Duplicar la NC / investigación incompleta** → `generate_nc_from_incident` idempotente (`for update`, solo si `nonconformity_id` nulo); `close_incident` exige investigación registrada y, para accidente, NC generada (no se cierra un accidente sin investigación, como pide el auditor/ley).

## ADRs

### ADR-118 — La investigación reutiliza NC + RCA + acciones (no tablas nuevas)
**Contexto:** la causa raíz estructurada (5 Porqués/Ishikawa) y el plan de acción CAPA ya existen y están auditados; ISO 45001 10.2 pide exactamente eso para un incidente.
**Decisión:** el incidente es el frente SST (clasificación + trabajador); la investigación se delega a una **NC generada** (origen `incidente_sst`) donde viven el RCA y `nc_actions`. El incidente solo guarda `nonconformity_id`.
**Consecuencias:** cero tablas de RCA/acciones nuevas; trazabilidad incidente→NC→acciones→tareas; coherente con inspecciones (ADR-117) y PQRS (ADR-030). A cambio, un incidente investigado implica una NC (aceptable: toda investigación formal es una no conformidad del SG-SST).

### ADR-119 — Reportar abierto, gestionar restringido
**Contexto:** la cultura de reporte 45001 exige que cualquier trabajador pueda avisar un casi-accidente; investigar y cerrar es responsabilidad SST.
**Decisión:** `report_incident` lo ejecuta cualquier `is_active_member`; investigar/generar NC/cerrar/anular exige `can_manage_sst` (Líder SIG o Líder de proceso).
**Consecuencias:** se fomenta el reporte sin abrir la gestión; mismo espíritu que "cualquiera reporta una NC, un líder la gestiona".

### ADR-120 — Plazo legal de investigación con recordatorio por cron
**Contexto:** Res. 1401/2007 exige investigar el accidente dentro de 15 días.
**Decisión:** al reportar un `accidente`, `investigation_due = occurred_at + 15 días`; `run_daily_jobs` crea la tarea `investigar_incidente` si vence sin investigación (reusa tasks+cron).
**Consecuencias:** cumplimiento legal visible y accionable; sin lógica de agenda nueva. Incidentes y casi-accidentes no fijan plazo legal (configurable a futuro).

---

## Decisiones que necesito de ti (para fijar el alcance)
1. **Investigación reutilizando NC+RCA+acciones** (ADR-118) en vez de tablas propias de investigación/acciones. *Recomiendo sí* (cero duplicación, ya auditado).
2. **Tipos:** accidente / incidente / casi-accidente; **enfermedad laboral diferida**. *Recomiendo sí.*
3. **Reportar abierto a cualquier miembro, gestionar solo SST** (ADR-119). *Recomiendo sí.*
4. **Datos del trabajador minimizados** (nombre + cargo; documento opcional), sin diagnóstico clínico, RLS roles SST. *Recomiendo sí.*
5. **Plazo de 15 días + recordatorio para accidentes** (ADR-120). *Recomiendo sí.*
6. **Cerrar un accidente exige investigación + NC**; incidente/casi-accidente pueden cerrarse sin NC. *Recomiendo sí.*
7. **Numeración** `INC-2026-001` por organización y año. *Recomiendo sí.*
8. **Fuera del MVP:** FURAT/formato ARL, equipo investigador multipersona, enfermedad laboral, costos, adjuntos, reporte a ARL. ¿De acuerdo con diferirlos?

**Siguiente:** tu aprobación (PARADA) → **diseño** (tablero + reporte + ficha con investigación). Luego backend, seguridad, deploy.
