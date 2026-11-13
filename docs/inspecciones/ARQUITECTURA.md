# Arquitectura — Inspecciones / Control de calidad (v1.6-1)

**Producto:** CrubolDocs · **Feature:** v1.6-1 · **Fecha:** 2026-11-13 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 9001 8.5/8.6 exige liberar producto/servicio verificando criterios. Hoy hay formularios y foto, pero no un módulo de inspección con **criterios de aceptación, muestreo y disposición** (aceptar/rechazar). El mercado SMB lo destaca (QT9, SafetyCulture).
- **Acción de valor:** el SIG define **planes de inspección** (características + criterios); se **inspecciona** (recepción, proceso, final) registrando resultados y una **disposición**; si se **rechaza**, se genera una NC o una salida no conforme con un clic.
- **Decisiones (Fernando):** (1) tipos **recepción + proceso + final**; (2) **plantillas reutilizables** con características numéricas (rango) o pasa/no pasa; (3) **muestreo simple** (lote/muestra/defectos/Ac-Re manual); (4) el rechazo **puede generar NC o salida no conforme**.
- **Habilita el SPC (#3):** las características numéricas de las inspecciones quedan como mediciones estructuradas; el SPC leerá esos valores para las cartas de control.
- **Dato personal:** ninguno (datos técnicos de producto/lote).

## 2. Modelo / técnica
- **`inspection_plans`** (plantilla): `(id, organization_id, name, description, process_id null, characteristics jsonb default '[]', is_active bool, created_by, created_at, updated_at; unique(id, organization_id))`. `characteristics` = `[{ name, type: 'numerico'|'pasa_falla', unit?, min?, max?, target? }]` (JSONB para editar sin hard delete, patrón de los flujos BPM). RLS select `can_see_inspections`.
- **`inspections`** (instancia): `(id, organization_id, code 'INS-AAAA-###', plan_id, type text check in ('recepcion','proceso','final'), supplier_id null, process_id null, lot_ref text, lot_size int, sample_size int, defects int, acceptance_number int, disposition text check in ('pendiente','aceptado','rechazado','concesion') default 'pendiente', note text, nonconformity_id null, nc_output_id null, inspected_at, created_by, created_at; unique(org, code); unique(id, org); FKs compuestas a inspection_plans, suppliers, nonconformities, nonconforming_outputs)`. Contador `ins_counters` deny-all. RLS select `can_see_inspections`.
- **`inspection_results`** (por característica, copiadas del plan al inspeccionar): `(id, organization_id, inspection_id, name, type, unit, min_val, max_val, value numeric null, passed bool null, ok bool)`. `ok` = cumple el criterio (valor dentro de rango o passed=true). **Base para el SPC** (valor numérico por característica a lo largo del tiempo). FK compuesta a inspections.
- **RPC gestión (definer, autz `can_manage_inspections(org, process)` = Líder SIG o Líder del proceso):**
  - `create_inspection_plan` / `update_inspection_plan` / `set_plan_characteristics(plan, jsonb)` / `set_plan_active`.
  - `create_inspection(org, plan, type, supplier, process, lot_ref, lot_size, sample_size, acceptance_number, results jsonb, defects, disposition)` → `INS-AAAA-###`; copia las características a `inspection_results` con sus valores y calcula `ok` por característica; fija la disposición.
  - `generate_nc_from_inspection(inspection)` → `report_nonconformity` (idempotente; si recepción, deja el `supplier_id` a la vista para un SCAR) y enlaza `nonconformity_id`.
  - `generate_nc_output_from_inspection(inspection)` → `create_nc_output` y enlaza `nc_output_id`.
- Reusa NC (8.5.6/10.2) y salida no conforme (8.7) existentes; no duplica el flujo CAPA.

## 3. Alcance del MVP
| Feature | ¿v1.6-1? | Justificación |
|---|---|---|
| Planes de inspección (características numérico/pasa-falla, activar) | **Sí** | Núcleo configurable |
| Inspección recepción/proceso/final con resultados + disposición | **Sí** | Decisión de Fernando |
| Muestreo simple (lote/muestra/defectos/Ac-Re) | **Sí** | Decisión de Fernando |
| Rechazo → generar NC o salida no conforme con un clic | **Sí** | Decisión de Fernando |
| Recepción liga proveedor (puente a SCAR) | **Sí** | Cierra el ciclo con proveedor |
| Resultados numéricos estructurados (base para SPC) | **Sí** | Habilita v1.6-3 |
| Tablas AQL/ANSI Z1.4 | No | Muestreo simple en v1 |
| Fotos/adjuntos en la inspección | No | Diferido |
| SPC / cartas de control | No | Es v1.6-3 (otra feature) |
| Inspección por equipo/calibración vinculada | No | Diferido |

**Camino dorado:** el SIG crea el plan "Recepción de materia prima" (características: diámetro 10±0.2 mm, limpieza pasa/no pasa) → al llegar un lote de un proveedor, registra la **inspección de recepción** (tamaño de muestra, valores, defectos) → si está fuera de rango, marca **rechazado** y pulsa **"Generar NC"** (apuntando al proveedor para un SCAR); si cumple, **aceptado**.

## 4. Mapa de rutas
- **`/app/inspecciones`** — tablero: lista de inspecciones (código, tipo, disposición, proceso/proveedor) con filtros + **"Nueva inspección"**; pestaña **"Planes"** (plantillas) para quien gestiona.
- **`/app/inspecciones/[codigo]`** — ficha: datos, muestreo, resultados por característica (con semáforo de criterio), disposición y, si rechazado, botones **Generar NC / Generar salida no conforme** (o enlaces si ya existen).
- Nav **Inspecciones**. Visible a roles SIG.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Aislamiento entre organizaciones** → RLS por `organization_id`, FKs compuestas, escritura por RPC con `can_manage_inspections`; `ins_counters` deny-all.
2. **Datos inconsistentes de resultados** → `create_inspection` **copia** las características del plan y calcula `ok` en el servidor; zod valida tipos/rangos en la server action.
3. **Duplicar NC/salida** → `generate_nc_from_inspection` idempotente (`for update`, solo si `nonconformity_id` nulo); igual para la salida no conforme.

## ADRs

### ADR-115 — Planes reutilizables + resultados estructurados (base para SPC)
**Contexto:** se necesita reutilización y datos limpios para el SPC.
**Decisión:** `inspection_plans.characteristics` en JSONB; al inspeccionar se **copian** a `inspection_results` con valor numérico/pasa-falla y `ok` calculado.
**Consecuencias:** plan editable sin afectar inspecciones pasadas; `inspection_results` numéricos alimentan v1.6-3 SPC.

### ADR-116 — Muestreo simple (sin AQL)
**Contexto:** acotar; AQL es pesado.
**Decisión:** lote/muestra/defectos/nº de aceptación capturados a mano; la disposición la decide la persona.
**Consecuencias:** simple y suficiente; AQL/ANSI Z1.4 diferido.

### ADR-117 — Rechazo genera NC o salida no conforme (reusa lo existente)
**Contexto:** no duplicar el flujo CAPA ni 8.7.
**Decisión:** el rechazo ofrece generar NC (`report_nonconformity`) o salida no conforme (`create_nc_output`) con un clic, idempotente; la recepción liga el proveedor para un SCAR.
**Consecuencias:** trazabilidad inspección→NC/salida→SCAR sin lógica nueva de disposición.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (tablero + planes + ficha de inspección). Luego backend, seguridad, deploy. Después v1.6-2 Incidentes SST.
