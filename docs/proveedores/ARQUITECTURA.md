# Arquitectura — Módulo 6: Proveedores (ISO 9001 8.4)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: M. Dominio **nuevo** (el proveedor es una entidad propia de la organización).

## 1. Negocio

- **Problema y para quién.** La norma 8.4 exige controlar los **proveedores externos**: definir criterios de **selección**, **evaluación** y **reevaluación**, y conservar la evidencia del desempeño. Hoy CrubolDocs no tiene proveedores; el SIG los lleva en hojas de cálculo. Lo usa el **Líder SIG** (y el **Líder del proceso** que contrata al proveedor); el resto de roles del SIG lo consulta.
- **Acción de valor principal.** Ver la **lista de proveedores con su estado vigente** (aprobado / condicionado / rechazado) y su **criticidad**, y **evaluar/reevaluar** con un puntaje calculado por criterios — con el historial y los vencimientos a la vista. Es el entregable que pide el auditor de 8.4.
- **Cobro.** Sin cobro por módulo (principio del proyecto); entra en el plan único de v1.
- **Mercado.** Colombia/B2B. El dato del proveedor (razón social, NIT, contacto) es **dato de empresa**, no personal sensible; aun así se aísla por organización con RLS estricto.

## 2. Modelo de dominio

Reutiliza `organizations`/`processes`/`positions`. Multi-tenant por `organization_id`, FKs compuestas `(id, organization_id)`, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de los módulos 1–5).

### Entidades nuevas (MVP)

1. **`suppliers`** — proveedor de la organización.
   `id, organization_id, code (PRV-AAAA-###), name (razón social), nit text null, kind ('bien'|'servicio'|'ambos'), category text null (texto libre: p. ej. "Insumos", "Transporte"), criticality ('alta'|'media'|'baja'), process_id? (proceso que lo usa), contact_name/contact_email/contact_phone text null, status ('pendiente'|'aprobado'|'condicionado'|'rechazado'|'inactivo'), next_eval_date date null, is_active bool default true, created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`. **El `status` lo fija el servidor** a partir de la última evaluación (o `inactivo` si se da de baja); nace `pendiente` (sin evaluar). Dato de empresa, **no** personal sensible.

2. **`supplier_evaluations`** — evaluación de selección o de desempeño (historial).
   `id, organization_id, supplier_id→suppliers(id,org), kind ('inicial'|'periodica'), eval_date date, score_quality smallint (0..100), score_delivery smallint (0..100), score_service smallint (0..100), weight_quality/weight_delivery/weight_service smallint (foto de los pesos usados), total_score numeric(5,2) (calculado), result ('aprobado'|'condicionado'|'rechazado') (calculado por umbrales), next_eval_date date null, note text null, evaluated_by, created_at`. `unique(id, organization_id)`. El **puntaje total y el resultado se calculan en el servidor** (como `indicator_compliance`/`assess_status`): nunca se aceptan del cliente.

3. **`supplier_counters`** — contador atómico `PRV-AAAA-###` por organización y año (patrón `nc_counters`, RLS deny-all).

### Criterios y umbrales (fijos en el MVP, ADR-025)

- Tres criterios 0–100: **Calidad** (peso 50), **Cumplimiento/entrega** (peso 30), **Servicio/precio** (peso 20). `total = round(Σ score·peso / Σ peso, 2)`.
- Umbrales: **≥ 80 → aprobado**, **60–79 → condicionado**, **< 60 → rechazado**. Pesos y umbrales son constantes del servidor en v1 (configurables = ampliación futura).

### Relaciones (texto)

- `suppliers 1—N supplier_evaluations` (historial; la **última por `eval_date`** define el `status` y el `next_eval_date` vigentes).
- `suppliers N—1 processes` (proceso que usa al proveedor; opcional) y `N—1 organizations`.
- El estado vigente y los conteos del tablero (aprobados / por reevaluar) son **derivados** de la última evaluación.

### Datos sensibles

Ninguno de persona. RLS estricto por `organization_id`; `log_event` en cada mutación (entidad `Proveedor`).

## 3. Alcance del MVP

| Feature | ¿v1? | Justificación |
|---|---|---|
| Alta de proveedor (datos + criticidad + proceso) con numeración `PRV-AAAA-###` | **Sí** | Base del módulo. |
| Evaluación **inicial** de selección (8.4.1) al registrar o como primer paso | **Sí** | La norma exige criterios de selección. |
| Evaluación **periódica** / reevaluación (8.4.2) con criterios ponderados → puntaje y resultado | **Sí** | Núcleo de 8.4; puntaje y resultado **calculados en servidor**. |
| Estado vigente derivado (aprobado/condicionado/rechazado) + historial de evaluaciones | **Sí** | La acción de valor. |
| Dar de baja / reactivar proveedor (`inactivo`) | **Sí** | Ciclo de vida básico. |
| Recordatorio de **reevaluación vencida** (tarea + cron) | **Sí** | Reutiliza el cron/tareas; barato. |
| Tablero con filtros (estado, criticidad, proceso) + exportación CSV | **Sí** | Consulta y evidencia. |
| Criterios/pesos/umbrales **configurables** por organización | **No** | Fijos con defaults razonables en v1; configurar = ampliación. |
| Proveedor incumplido → **No Conformidad** con un clic | **No (diferido)** | Se anota; se evalúa cuando el módulo esté en uso (igual que en Competencias). |
| Indicador "% de proveedores aprobados" | **No (diferido)** | Derivable; se conecta a Indicadores después. |
| **Certificados/documentos** del proveedor en Storage | **No (diferido)** | Acota la superficie de la auditoría; se añade con el patrón endurecido server-only (ADR-027). |
| Órdenes de compra / recepción / facturas | **No** | Es un ERP; fuera de 8.4. |
| Sugerencia de evaluación por el agente IA | **No** | Requiere re-auditoría de privacidad; solo ROADMAP. |

**Camino dorado:** Líder SIG (o Líder del proceso) **registra un proveedor** (razón social, NIT, tipo, criticidad, proceso) → hace su **evaluación inicial** (3 criterios) → el sistema calcula el puntaje y el **resultado** (aprobado/condicionado/rechazado) y fija el estado y la próxima reevaluación → el tablero lo muestra con su estado y criticidad → al vencer la reevaluación, una **tarea** lo recuerda → se **reevalúa** y el estado se actualiza.

Cabe en 2 pantallas (tablero + ficha) con Sheets.

## 4. Mapa de rutas

Bajo `/app` (middleware ya protege). Ver = roles del SIG; gestionar (alta/editar/evaluar/baja) = Líder SIG o Líder del proceso del proveedor.

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/proveedores` | Tablero: tarjetas resumen (aprobados, condicionados/rechazados, por reevaluar), lista con `código`, nombre, tipo, criticidad, estado (badge) y próxima reevaluación; filtros estado/criticidad/proceso/buscar; Sheet "Nuevo proveedor"; exportar CSV. | Ver: roles SIG. Gestión: Líder SIG / Líder del proceso. |
| `/app/proveedores/[codigo]` | Ficha: datos del proveedor (editar), **estado vigente** con su puntaje, **historial de evaluaciones** (criterios, total, resultado, fecha), Sheet "Evaluar / Reevaluar" (3 criterios con puntaje y resultado estimado en vivo), dar de baja/reactivar, trazabilidad (`NcTimeline`). | Ídem; la gestión según rol. |

## 5. Integraciones y riesgos

**Integraciones (reutilizadas, sin dependencias nuevas):** tareas+cron/correo (recordatorio de reevaluación), `log_event` (traza), exportación CSV. Diferidas: **No Conformidades** (proveedor→NC con `source='proveedor'`), **Indicadores** (% aprobados), **Storage** (certificados).

**Top 3 riesgos y mitigación:**
1. **Integridad del puntaje/resultado** (que el cliente no imponga "aprobado"). → `total_score` y `result` se **calculan y persisten solo en el RPC** por los pesos/umbrales del servidor; el cálculo cliente es solo vista previa; la escritura es exclusiva por RPC (RLS solo-SELECT). Prueba de que el resultado derivado es correcto por umbral.
2. **Aislamiento multi-tenant.** → `organization_id` + FKs compuestas `(id, organization_id)`; `supplier_evaluations` referencia `(supplier_id, organization_id)`; `process_id` por `(process_id, organization_id)`. Prueba de 2 organizaciones.
3. **Inflado hacia un ERP de compras** (órdenes, facturas, recepción). → Alcance cortado a selección/evaluación/reevaluación; lo demás al ROADMAP.

## Decisiones (ADR)
- **ADR-024** — Escritura por RPC `SECURITY DEFINER` y visibilidad (gestión Líder SIG o Líder del proceso; ver roles SIG); numeración `PRV-AAAA-###` con contador atómico.
- **ADR-025** — Evaluación con **criterios ponderados fijos** (calidad/entrega/servicio) y **puntaje + resultado calculados en el servidor** por umbrales; la última evaluación define el estado vigente.
- **ADR-026** — Reevaluación periódica con **recordatorio por tarea+cron** al vencer `next_eval_date`.
- **ADR-027** — **Diferidos:** proveedor→NC con un clic, indicador "% aprobados" y **certificados en Storage** (se añaden con su propia auditoría, como en Competencias).

## Checklist de salida
- [x] Multi-tenant (org + membership + rol) reutilizado.
- [x] MVP en 2 pantallas.
- [x] Camino dorado de punta a punta.
- [x] Riesgos con mitigación.
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
