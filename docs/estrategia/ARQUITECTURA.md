# Arquitectura — Módulo 8: Actas/reuniones y Objetivos de calidad (BSC) (ISO 9001 6.2)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: L → **MVP recortado agresivo**. Dos subdominios separados: **Actas** (reuniones del SIG) y **Objetivos de calidad / BSC**. Cierra la suite ISO 9001.

## 1. Negocio

- **Problema y para quién.** 6.2 exige **objetivos de la calidad** medibles, con responsable, plazo y seguimiento; y la organización deja **actas** de sus comités/reuniones de seguimiento del SIG. Hoy esto vive en Word y hojas de cálculo. Lo usa el **Líder SIG** (y el **Líder del proceso** dueño); el resto de roles del SIG consulta. La Revisión por la dirección (Módulo 4) es un acta formal aparte; **este módulo NO la reemplaza**: cubre las reuniones generales.
- **Acción de valor principal.** (a) Levantar un **acta** con asistentes, temas y **compromisos** (responsable + plazo) que se vuelven **tareas**; (b) definir **objetivos de calidad por perspectiva BSC** y ver su **avance derivado de los indicadores** que ya mide el Módulo 3.
- **Cobro.** Sin cobro por módulo; plan único de v1.
- **Mercado.** Colombia/B2B. Los nombres de asistentes son **dato personal** (minimización + RLS).

## 2. Modelo de dominio

Reutiliza `organizations`/`processes`/`positions`/`indicators`. Multi-tenant por `organization_id`, FKs compuestas `(id, organization_id)`, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de los módulos 1–7).

### Subdominio A — Actas

1. **`meeting_minutes`** — acta de reunión. `id, organization_id, code (ACT-AAAA-###), title, meeting_type text (comité/seguimiento/otro, texto libre), meeting_date date, process_id?, attendees text (lista de asistentes; **dato personal**: nombres), agenda text (orden del día/temas), status ('borrador'|'cerrada') default 'borrador', created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`. **Sin firma** (ADR-032).
2. **`meeting_commitments`** — compromiso/acción de la reunión. `id, organization_id, minute_id→meeting_minutes(id,org), description text, responsible_position_id?, due_date date?, status ('pendiente'|'cumplido') default 'pendiente', task_id? (tarea generada), created_by/at`. `unique(id, organization_id)`.
3. **`meeting_counters`** — contador atómico `ACT-AAAA-###` (patrón `nc_counters`, deny-all).

### Subdominio B — Objetivos de calidad / BSC

4. **`quality_objectives`** — objetivo de calidad. `id, organization_id, code (OBJ-AAAA-###), description text, perspective ('financiera'|'cliente'|'procesos'|'aprendizaje'), process_id?, target_text text? (meta en palabras), horizon_year int? (año/horizonte), status ('activo'|'cumplido'|'no_cumplido'|'archivado') default 'activo', created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`.
5. **`objective_indicators`** — liga un objetivo con N indicadores existentes. `id, organization_id, objective_id→quality_objectives(id,org), indicator_id→indicators(id,org); unique(objective_id, indicator_id); unique(id, organization_id)`. El **avance** del objetivo se **deriva** del cumplimiento de la última medición de esos indicadores (ADR-033); no se persiste.
6. **`objective_counters`** — contador atómico `OBJ-AAAA-###`.

### Relaciones (texto)
- `meeting_minutes 1—N meeting_commitments`; un compromiso puede generar **una tarea** (`task_id`).
- `quality_objectives N—N indicators` vía `objective_indicators`; el avance = % de indicadores ligados cuya última medición `cumple` (derivado).
- Ambos cuelgan de `processes` (opcional) y `organizations`.

### Datos sensibles
`meeting_minutes.attendees` (nombres de personas, posiblemente externas) → **dato personal**: minimizar (solo nombres necesarios), RLS por `organization_id` (roles del SIG), `log_event` en cada mutación.

## 3. Alcance del MVP (recortado por ser L)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Acta de reunión (`ACT-AAAA-###`, tipo, fecha, asistentes, temas) borrador→cerrada | **Sí** | Base del subdominio A. |
| Compromisos del acta (responsable + plazo) + marcar **cumplido** | **Sí** | El valor del acta; seguimiento. |
| Compromiso → **tarea** (`cumplir_compromiso`/entity_type `acta`) + recordatorio por cron | **Sí** | Reutiliza tareas+cron; barato. |
| Objetivo de calidad por **perspectiva BSC** (`OBJ-AAAA-###`, meta, proceso, horizonte) | **Sí** | Núcleo de 6.2. |
| Ligar objetivo ↔ **indicadores** existentes + **avance derivado** | **Sí** | El valor BSC: conecta 6.2 con 9.1 ya construido. |
| Estado del objetivo (activo/cumplido/no_cumplido/archivado), manual | **Sí** | Cierre del ciclo. |
| Tableros + filtros + exportación CSV | **Sí** | Consulta y evidencia. |
| **Firma** del acta (ADR-004) | **No** | La firma formal vive en la Revisión por la dirección; un acta de comité no la requiere. |
| **Adjuntos** (acta escaneada, soportes) en Storage | **No (diferido)** | Acota superficie; se añade con el patrón endurecido server-only. |
| Compromiso/objetivo incumplido → **NC** con un clic | **No (diferido)** | Se anota; se evalúa en uso real (como en módulos previos). |
| El snapshot de la **Revisión** lee objetivos/actas automáticamente | **No (diferido)** | Hoy son entradas de texto del acta (ADR-016). |
| **Mapa estratégico** gráfico / cascada de objetivos | **No** | Otro producto; fuera de 6.2 mínimo. |
| **Versionado de la política de calidad** (5.2) | **No** | La política se gestiona como documento controlado (Módulo 1 docs). |
| Convocatoria/agenda con **calendario**, votaciones, actas colaborativas en vivo | **No** | Fuera de alcance; un editor de texto simple basta. |
| Redacción/resumen de actas por el **agente IA** | **No** | Requiere re-auditoría (dato personal); solo ROADMAP. |

**Camino dorado:** (A) el Líder SIG crea un **acta** (tipo, fecha, asistentes, temas) → agrega **compromisos** con responsable y plazo (cada uno genera una **tarea**) → **cierra** el acta; al cumplirse, marca el compromiso como **cumplido** (completa la tarea). (B) Define un **objetivo de calidad** en una **perspectiva BSC**, le **liga indicadores** del Módulo 3 → el tablero muestra el **avance** derivado del cumplimiento de esos indicadores → al final del horizonte marca el objetivo **cumplido/no_cumplido**.

Pantallas: `/app/actas` (tablero + ficha) y `/app/objetivos` (tablero por perspectiva con Sheets; sin ficha aparte) → 3 vistas.

## 4. Mapa de rutas

Bajo `/app` (middleware protege). Ver = roles del SIG; gestionar = Líder SIG o Líder del proceso dueño.

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/actas` | Tablero: lista de actas (código, título, tipo, fecha, estado, nº de compromisos) + filtros tipo/estado/año/proceso; Sheet "Nueva acta"; CSV. | Ver: roles SIG. Gestión: Líder SIG / Líder del proceso. |
| `/app/actas/[codigo]` | Ficha: encabezado + estado; datos (tipo, fecha, asistentes —dato personal—, temas); **compromisos** (lista con responsable/plazo/estado, "Agregar compromiso" → genera tarea, marcar cumplido); cerrar acta; trazabilidad (`NcTimeline`). | Ídem. |
| `/app/objetivos` | Tablero BSC: objetivos **agrupados por las 4 perspectivas**, cada uno con su meta, indicadores ligados y **avance** (semáforo/%); filtros perspectiva/estado/proceso; Sheet "Nuevo objetivo" (con selección de indicadores) y edición; CSV. | Ver: roles SIG. Gestión: Líder SIG / Líder del proceso. |

## 5. Integraciones y riesgos

**Integraciones (reutilizadas, sin dependencias nuevas):** tareas+cron/correo (compromiso→tarea `cumplir_compromiso`, recordatorio al vencer), `log_event`, exportación CSV, **Indicadores** (lectura de `indicators` + su última medición/compliance para el avance del objetivo). Diferidos: NC (compromiso/objetivo→NC), lectura por el snapshot de la Revisión, adjuntos en Storage, firma.

**Top 3 riesgos y mitigación:**
1. **Alcance (módulo L).** → MVP recortado a actas+compromisos y objetivos+avance derivado; todo lo "estratégico avanzado" (mapa, cascada, política versionada, calendario) al ROADMAP. Dos subdominios simples, no un producto de planeación.
2. **Aislamiento multi-tenant y dato personal de asistentes.** → `organization_id` + FKs compuestas; RLS solo-SELECT por roles del SIG; `objective_indicators` liga solo indicadores de la **misma** organización (FK compuesta); asistentes minimizados; prueba de 2 organizaciones.
3. **Avance del objetivo coherente con Indicadores.** → el avance se **calcula en el servidor** leyendo la última medición (`compliance`) de los indicadores ligados (no se captura ni se confía del cliente); si un objetivo no tiene indicadores, el avance es "sin datos" (no inventar un número).

## Decisiones (ADR)
- **ADR-032** — Actas: escritura por RPC, estado **borrador→cerrada sin firma** (la firma formal vive en la Revisión por la dirección); los **compromisos generan tareas** (`cumplir_compromiso`/entity_type `acta`) y se marcan cumplidos; numeración `ACT-AAAA-###`.
- **ADR-033** — Objetivos/BSC: **perspectivas BSC fijas**; un objetivo liga **N indicadores** existentes y su **avance se deriva en el servidor** del cumplimiento de la última medición de esos indicadores; el estado (cumplido/no_cumplido) es manual. Numeración `OBJ-AAAA-###`.
- **ADR-034** — Alcance y diferidos: dos rutas (`/app/actas` con ficha; `/app/objetivos` página única por perspectiva); **diferidos** firma, adjuntos en Storage, compromiso/objetivo→NC, lectura por el snapshot de la Revisión y el mapa estratégico/cascada/política versionada.

## Checklist de salida
- [x] Multi-tenant (org + membership + rol) reutilizado.
- [x] MVP en 3 vistas.
- [x] Camino dorado de punta a punta (ambos subdominios).
- [x] Riesgos con mitigación.
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
