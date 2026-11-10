# Arquitectura — Módulo Indicadores de gestión (KPIs)

> Módulo 3 del roadmap (`docs/ROADMAP.md`). ISO 9001 cap. 9.1 (seguimiento, medición, análisis y
> evaluación). Es el **diferenciador declarado**: la reportería es la debilidad de los competidores
> (Isolución/KAWAK/ISOTools) → ganamos con UX moderna y clara. Stack fijo; reutiliza cargos/roles,
> procesos, numeración atómica, auditoría (`log_event`), tareas+cron/correo, exportación CSV, y el
> patrón RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de riesgos/NC/auditorías).

## 1. Negocio

- **Problema:** la organización debe definir indicadores por proceso, fijarles meta, medirlos con una
  periodicidad y evaluar si cumplen (ISO 9.1). Hoy CrubolDocs no permite definir KPIs ni capturar
  mediciones; sin esto no hay evidencia de evaluación del desempeño y la revisión por la dirección
  (Módulo 4) se queda sin entradas numéricas.
- **Acción de valor:** definir un indicador (meta, unidad, sentido, frecuencia) → capturar su medición
  cada periodo → ver de un vistazo si **cumple / en riesgo / no cumple** y su tendencia; y que un
  indicador **no cumplido** pueda convertirse en una **No Conformidad / acción de mejora** con un clic
  (cierra el lazo medición → mejora).
- **Cobro:** sin cambios (v1 sin cobro).

## 2. Modelo de dominio (nuevas entidades)

Multi-tenant ya existe. Patrón del proyecto: FKs compuestas `(id, organization_id)`; escrituras solo
por funciones `SECURITY DEFINER`.

### `indicators` (la ficha/definición del KPI)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| code | text not null | `IND-AAAA-###`; `unique(organization_id, code)` |
| name | text not null | p. ej. "Cumplimiento de entregas a tiempo" |
| process_id | uuid not null → processes(id, org) | proceso dueño (un indicador cuelga de un proceso) |
| description | text null | definición / fórmula de cálculo (texto; cómo se calcula) |
| unit | text not null | unidad: `%`, `días`, `#`, `COP`, … (texto libre corto) |
| direction | text not null | sentido: `mayor_mejor` \| `menor_mejor` \| `rango` |
| target | numeric(14,4) not null | meta (para `rango`, es el límite inferior) |
| target_max | numeric(14,4) null | solo `rango`: límite superior |
| tolerance_pct | numeric(5,2) null | margen "en riesgo" alrededor de la meta (p. ej. 10 = ±10%); default por convención |
| frequency | text not null | `mensual` \| `bimestral` \| `trimestral` \| `semestral` \| `anual` |
| owner_position_id | uuid null → positions(id, org) | cargo responsable de capturar |
| is_rate | boolean not null default false | si true, la medición usa numerador/denominador |
| status | text not null default `activo` | `activo` \| `archivado` (no se borra; se archiva) |
| created_by / created_at / updated_at | | |

### `indicator_measurements` (mediciones periódicas)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| indicator_id | uuid not null → indicators(id, org) | |
| period | date not null | **primer día del periodo** (normaliza mes/trimestre); `unique(indicator_id, period)` |
| value | numeric(14,4) not null | valor del periodo (si `is_rate`, se calcula = num/den×(factor) en el RPC) |
| numerator | numeric(14,4) null | solo indicadores de tasa |
| denominator | numeric(14,4) null | solo indicadores de tasa (RPC rechaza 0) |
| compliance | text not null | **derivado y persistido** en el RPC: `cumple` \| `en_riesgo` \| `no_cumple` |
| note | text null | explicación / plan si no cumple |
| nonconformity_id | uuid null → nonconformities(id, org) | NC generada desde la medición (enlace) |
| captured_by / captured_at | | quién y cuándo capturó |

### `indicator_counters` — numeración atómica `IND-AAAA-###` por organización/año (igual que `nc_counters`).

**Datos sensibles:** las mediciones son desempeño interno de la organización → RLS estricta +
auditoría de las mutaciones. El `compliance` se calcula en el servidor (RPC), nunca se confía del
cliente.

### Cálculo del estado de cumplimiento (en el RPC, determinista)
Comparando `value` contra `target`/`target_max` según `direction` y `tolerance_pct`:
- `mayor_mejor`: `cumple` si `value ≥ target`; `en_riesgo` si está dentro de la tolerancia por debajo; si no `no_cumple`.
- `menor_mejor`: `cumple` si `value ≤ target`; `en_riesgo` dentro de la tolerancia por encima; si no `no_cumple`.
- `rango`: `cumple` si `target ≤ value ≤ target_max`; `en_riesgo` dentro de la tolerancia fuera del rango; si no `no_cumple`.

## 3. Estados y transiciones

El indicador (la ficha) vive en `activo`/`archivado`; la riqueza está en las **mediciones**, no en una
máquina de estados compleja.

```
Ficha:   activo ──archive_indicator──▶ archivado   (reversible: unarchive_indicator)

Medición (por periodo):
  (vacío) ──record_measurement(period, valor|num/den, nota)──▶ registrada[compliance derivado]
                     │
                     └── (si no_cumple) ──generate_nc_from_measurement──▶ NC enlazada (un clic)
```

- Una medición se puede **corregir** (re-`record_measurement` del mismo periodo = upsert) mientras el
  periodo esté abierto; recalcula `compliance` y re-audita.
- La generación de NC es **idempotente** (verifica `nonconformity_id` vacío + `for update`).

## 4. Rutas y RLS

### Rutas (fase frontend)
| Ruta | Muestra | Rol |
|---|---|---|
| `/app/indicadores` | Tablero: tarjetas resumen (nº activos, % en cumplimiento, nº en riesgo, nº no cumple este periodo) + lista de indicadores con su último valor, meta, estado (badge) y mini-tendencia; filtros por proceso/estado/frecuencia | `can_see_indicators` |
| `/app/indicadores/[codigo]` | Ficha: definición (meta, unidad, sentido, frecuencia, responsable), **gráfica de tendencia** de las mediciones, tabla de mediciones con su cumplimiento y nota, botón "Registrar medición", y "Generar NC" en una medición no cumplida | `can_see_indicators` |
| "Nuevo indicador" / "Editar" (Sheet) | Líder SIG | |
| "Registrar medición" (Sheet) | Líder SIG o Líder del proceso dueño | |

### Autorización (helpers SQL, espejo de No Conformidades/Auditorías)
- `can_see_indicators(org)` = roles del SIG (`lider_sig`, `lider_proceso`, `responsable_control`,
  `auditor`, `consulta`).
- `can_manage_indicators(org)` = `lider_sig` (crear/editar/archivar la ficha del indicador).
- Registrar medición: `can_manage_indicators(org)` **o** `has_role(org,'lider_proceso', indicator.process_id)`
  (el líder del proceso dueño captura sus propias mediciones).

### Políticas
- `indicators`, `indicator_measurements`: **RLS on**, solo **SELECT** con `can_see_indicators`. Sin
  escritura por REST. `indicator_counters`: RLS on, sin políticas (deny-all).

### Funciones `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event` en cada una)
| Función | Quién | Efecto |
|---|---|---|
| `create_indicator(org, name, process, description, unit, direction, target, target_max, tolerance, frequency, owner, is_rate)` | `can_manage_indicators` | crea indicador `activo`, asigna `code` |
| `update_indicator(id, …)` | `can_manage_indicators` | edita la definición (no las mediciones) |
| `archive_indicator(id)` / `unarchive_indicator(id)` | `can_manage_indicators` | archiva/reactiva |
| `record_measurement(indicator, period, value, numerator, denominator, note)` | `can_manage_indicators` o líder del proceso | upsert de la medición del periodo; calcula y persiste `compliance` |
| `generate_nc_from_measurement(measurement)` | `can_manage_indicators` o líder del proceso | si la medición es `no_cumple` y no tiene NC, llama a `report_nonconformity(source='indicador', …)` y enlaza (idempotente, `for update`) |

## 5. Integraciones y riesgos

**Integra con lo existente:**
- **No Conformidades (Módulo 1):** `generate_nc_from_measurement` reutiliza `report_nonconformity`.
  **Decisión (ADR-013):** agregar `'indicador'` al `check` de `nonconformities.source` para trazar el
  origen con precisión (hoy están `'mejora'`/`'otro'`, pero perderían la trazabilidad). Migración
  altera el constraint (patrón ya usado para `tasks_type_check`).
- **Revisión por la dirección (Módulo 4, futuro):** los indicadores y su cumplimiento serán una entrada
  directa del acta; el modelo se diseña pensando en consolidar "desempeño por proceso".
- **Tareas + cron/correo:** al crear un indicador con responsable, el cron encola una tarea
  `capturar_medicion` cuando vence el periodo sin medición (espejo de documentos vencidos). Nueva
  `TaskType` `capturar_medicion` y `entity_type` `indicador`. **Decisión:** incluir el recordatorio en
  el MVP (barato, reusa tareas+cron+outbox) — ADR-012.
- **Auditoría (`log_event`)** y **numeración (`indicator_counters`)** reutilizados.
- **Exportación CSV UTF-8 con BOM:** exportar un indicador con sus mediciones (sin dependencia nueva).

**Gráfica de tendencia:** la ficha muestra la serie de mediciones. **Decisión (ADR-014):** dibujar la
tendencia con **SVG propio** (línea + puntos + banda de meta), sin librería de charts, para no agregar
dependencia y mantener el control visual de los tokens Hex Core. Si más adelante se piden gráficas
ricas, se evalúa una librería entonces.

**Top 3 riesgos técnicos y mitigación:**
1. **Cumplimiento calculado mal / manipulable** → el `compliance` se calcula **solo en el RPC**
   (determinista, con la fórmula de §2), se persiste, y se cubre con pruebas unitarias de la lógica y
   RLS de la escritura. El cliente nunca lo envía.
2. **Fuga entre tenants / permisos** → RLS solo-SELECT + escritura por RPC con chequeo de rol; FKs
   compuestas; pruebas RLS nuevas. Espejo de NC/Auditorías (ya auditados APTO). El líder de proceso
   solo captura mediciones de **su** proceso (chequeo con `process_id`).
3. **Periodos inconsistentes / mediciones duplicadas** → `period` normalizado al primer día del periodo
   y `unique(indicator_id, period)`; `record_measurement` hace upsert atómico. División por cero en
   tasas rechazada en el RPC.

## 6. Plan de migración y fases
- Migración `022_indicadores.sql`: tablas + índices que cubren FKs + RLS + helpers + RPCs + contador;
  `alter` del `source` de `nonconformities` (+`'indicador'`) y de `tasks` (+`capturar_medicion`/`indicador`).
- Tipos de vista + `TaskType` `capturar_medicion`.
- Pruebas RLS (aislamiento, crear/editar por rol, capturar por líder de proceso del proceso correcto,
  cumplimiento derivado correcto por sentido, generar NC enlazada e idempotente, numeración).
- Fases siguientes: diseño → frontend → backend → seguridad → testing → deploy.

## 7. ADRs
- **ADR-011** — Módulo Indicadores: escritura por RPC `SECURITY DEFINER`, visibilidad espejo del SIG,
  numeración `IND-AAAA-###` con contador atómico; `compliance` calculado y persistido en el servidor.
- **ADR-012** — Recordatorio de captura de medición vencida vía tareas+cron (nueva `TaskType`).
- **ADR-013** — Un indicador `no_cumple` genera una NC con un clic (`source='indicador'`, enum ampliado),
  enlazada y sin duplicar.
- **ADR-014** — Gráfica de tendencia con SVG propio, sin librería de charts (evita dependencia).

---

## Propuesta de alcance (MVP) — PENDIENTE DE APROBACIÓN

**Entra en v1:** definir indicadores por proceso (meta, unidad, sentido mayor/menor/rango, frecuencia,
responsable, tasa opcional num/den) → capturar la medición de cada periodo con cálculo automático de
**cumple / en riesgo / no cumple** → verlo en un tablero con resumen y en una ficha con **gráfica de
tendencia** y tabla de mediciones → generar una NC desde una medición no cumplida (un clic) →
recordatorio por tarea cuando vence un periodo sin medición. Lista + ficha. Numeración `IND-AAAA-###`.
Exportar a CSV.

**Fuera del MVP (siguientes iteraciones):** objetivos de calidad / cuadro de mando (BSC) que agrupe
indicadores (Módulo 8); fórmulas calculadas automáticamente desde otros datos de la app (p. ej.
"nº de NC del proceso"); metas que cambian por periodo (histórico de metas); comentarios/aprobación de
la medición; dashboards configurables; alertas por correo al incumplir (más allá de la tarea de
captura); gráficas con librería dedicada.

### Decisiones que necesito de ti (para fijar el alcance)
1. **Sentido del indicador:** `mayor es mejor` / `menor es mejor` / `rango` (entre dos límites) →
   recomiendo los tres (cubren casi todo KPI real).
2. **Estado de cumplimiento en 3 niveles** (`cumple`/`en riesgo`/`no cumple`) con una **tolerancia %**
   configurable para el "en riesgo" → recomiendo así (un simple cumple/no-cumple se queda corto para
   la UX que nos diferencia). Tolerancia por defecto 10% si no se indica, ¿ok?
3. **Indicadores de tasa** (numerador/denominador, p. ej. "entregas a tiempo / entregas totales") además
   de valor directo → recomiendo incluirlos (son la mayoría de KPIs de calidad); el usuario elige al crear.
4. **Permisos de captura:** define la ficha el **Líder SIG**; **captura mediciones** el Líder SIG o el
   **Líder del proceso dueño** (de su propio proceso) → recomiendo así.
5. **Indicador no cumplido → NC** con un clic (no automático), con `source='indicador'` nuevo en el enum
   → recomiendo así (trazabilidad limpia hacia la mejora).
6. **Recordatorio de captura** por tarea+cron cuando vence el periodo → recomiendo incluirlo en el MVP.
7. **Gráfica de tendencia con SVG propio** (sin librería de charts) → recomiendo así por ahora.
8. **Frecuencias:** mensual / bimestral / trimestral / semestral / anual → ¿suficientes?
