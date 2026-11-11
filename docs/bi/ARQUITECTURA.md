# Arquitectura — BI / Constructor de informes (v1.4-6)

**Producto:** CrubolDocs · **Feature:** v1.4-6 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** hoy los reportes son fijos (4 PDF de v1.3) y el tablero muestra KPIs predefinidos. El usuario no puede armar un informe propio (p. ej. "NC por proceso del último trimestre"). La competencia (Power BI embebido, SoftExpert Analytics) vende constructor de informes.
- **Acción de valor:** el usuario **elige una fuente** (dataset del SGC), **filtra**, **selecciona columnas** y opcionalmente **agrupa/agrega** (conteo, suma, promedio), obtiene una **tabla + gráfica** y la **guarda** (privada o compartida) y exporta a CSV.
- **Decisiones (Fernando):** (1) constructor **tabular + agregación**; (2) **6 datasets** curados; (3) salida **tabla + gráficas (barras/línea/torta)**; (4) informes **privados y compartidos**.
- **Seguridad que condiciona el diseño:** **sin SQL libre del usuario** (ADR-097). El motor trabaja sobre **datasets predefinidos** leídos con el cliente del usuario (RLS activa); el filtrado/agrupación se calcula en el servidor sobre esas filas (volumen bajo por organización, como los demás loaders). El usuario nunca compone SQL.

## 2. Modelo / técnica

### Datos guardados
- **`saved_reports`**: `(id, organization_id, name, description, dataset text, config jsonb, scope text check in ('privada','compartida') default 'privada', created_by, created_at, updated_at; unique(id, organization_id))`.
  - `config` = `{ columns: string[], filters: [{field, op, value}], groupBy: string|null, aggregate: {fn:'count'|'suma'|'promedio', field?:string}|null, chart: 'barra'|'linea'|'torta'|null, sort?: {field, dir} }`.
  - RLS select: `is_active_member(org) AND (scope='compartida' OR created_by = auth.uid())`.
  - Escritura por RPC: crear/editar/eliminar; **privada** la gestiona su autor; **compartida** la gestiona el Líder SIG/Admin (`can_manage_reports`). (Eliminación por baja: `delete` lo hace la RPC vía estado o `execute_sql`; se evita el hard delete en migración.)

### Motor de datasets (sin SQL libre) — ADR-097/098
- Un **catálogo** en código (`src/lib/bi/datasets.ts`) define los 6 datasets: `key`, etiqueta, y por **columna** `{ field, label, type: 'texto'|'numero'|'fecha'|'enum', groupable, filterable, enumLabels? }`.
- Por dataset, un **loader** server-side lee las filas con el **cliente del usuario** (RLS) desde las tablas ya existentes y las normaliza a registros `{field: value}`.
- Una **server action** `runReport(dataset, config)` carga el dataset, aplica filtros, ordena, y si hay `groupBy` agrega (`count`/`suma`/`promedio`); devuelve `{ rows, grouped?, chartData? }`. Nada de SQL dinámico.
- **Datasets v1:** No conformidades, Hallazgos de auditoría, Mediciones de indicadores, PQRS, Proveedores, Solicitudes.

### Gráficas sin dependencia nueva
- Barras/línea/torta en **SVG inline** (patrón ya usado para sparklines/medidores). Sin librería de charting (regla de dependencias).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| 6 datasets con RLS (NC, hallazgos, mediciones, PQRS, proveedores, solicitudes) | **Sí** | Decisión de Fernando |
| Builder: columnas + filtros (igual/contiene/rango) + groupBy + agregación (conteo/suma/promedio) | **Sí** | Núcleo |
| Salida: tabla (detalle o agrupada) + gráfica (barras/línea/torta) + CSV | **Sí** | Decisión de Fernando |
| Guardar informes privados y compartidos | **Sí** | Decisión de Fernando |
| Cruces entre datasets / joins arbitrarios | No | Fuera de alcance; cada informe es sobre un dataset |
| SQL libre / fórmulas calculadas por el usuario | No | Riesgo de inyección/RLS (ADR-097) |
| Programar envío por correo del informe | No | Diferido |
| Incrustar informes en el tablero de inicio | No | Diferido (el tablero ya es configurable aparte) |

**Camino dorado:** el usuario entra a **Informes**, crea uno nuevo → elige **No conformidades**, filtra `detectado ≥ 2026-07-01`, agrupa por **proceso**, agrega **conteo**, elige **barras** → ve la tabla y la gráfica, exporta CSV y **guarda** el informe como **compartido** para el comité.

## 4. Mapa de rutas
- **`/app/informes`** — lista de informes guardados (compartidos de la org + los privados del usuario) + **"Nuevo informe"**. Visible a miembros activos.
- **`/app/informes/nuevo`** y **`/app/informes/[id]`** — constructor/visor: panel de configuración (dataset, columnas, filtros, agrupación, gráfica) + resultados (tabla + gráfica) + guardar/CSV. Editar: el autor (privada) o Líder SIG (compartida).
- Sin cambios en otras rutas.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (lecturas con RLS existentes, gráficas en SVG inline).

**Top 3 riesgos y mitigación:**
1. **Fuga de datos entre organizaciones** → los loaders usan el **cliente del usuario** (RLS por `organization_id`); el `config` solo nombra columnas del catálogo (lista blanca), nunca SQL ni tablas.
2. **Inyección / columnas arbitrarias** → `config` validado contra el **catálogo** del dataset (campos y operadores permitidos); valores de filtro tratados como datos, no como SQL.
3. **Volumen** → como el resto de la app, los datasets son de **bajo volumen por organización**; si alguno creciera, se acota con filtros obligatorios por fecha (se documenta; no se espera en el MVP).

## ADRs

### ADR-097 — Constructor sobre datasets predefinidos (sin SQL libre)
**Contexto:** exponer datos a un builder sin abrir SQL ni romper la RLS.
**Decisión:** un catálogo de datasets/columnas en código; el usuario arma `config` (columnas/filtros/agrupación) validado contra el catálogo; nunca compone SQL.
**Consecuencias:** superficie segura y acotada; el precio es que solo se informan los datasets previstos (ampliables en código).

### ADR-098 — Cómputo en memoria sobre lecturas con RLS
**Contexto:** evitar SQL dinámico manteniendo la RLS.
**Decisión:** cada dataset se lee con el cliente del usuario y se filtra/agrupa/agrega en el servidor (volumen bajo por org, como los loaders existentes).
**Consecuencias:** simple y seguro; adecuado al tamaño de datos de la app. Contra: no apto para millones de filas (no es el caso).

### ADR-099 — Informes guardados con ámbito privado/compartido; gráficas inline
**Contexto:** compartir informes del equipo sin ceder control, sin sumar dependencias.
**Decisión:** `saved_reports.scope` privada/compartida (RLS por autor/compartida); compartidas las gestiona el Líder SIG; gráficas en SVG inline.
**Consecuencias:** se comparte conocimiento del equipo con control de permisos; cero dependencias nuevas.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (lista + constructor con panel de config y resultados). Luego backend, seguridad, deploy. Después #7 Notificaciones Slack/Teams.
