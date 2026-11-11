import {
  columnMeta, datasetMeta, type AggFn, type ChartKind, type ColumnType,
  type DatasetKey, type FilterOp, type ReportConfig, type ReportFilter, type ReportRow,
} from "@/lib/bi/datasets"

// Cómputo puro del constructor de informes: validación contra el catálogo, filtros, agregación.
// No toca la base de datos; opera sobre las filas que el loader (con RLS) ya devolvió.

const OPS_BY_TYPE: Record<ColumnType, FilterOp[]> = {
  texto: ["igual", "contiene"],
  enum: ["igual"],
  numero: ["igual", "mayor_igual", "menor_igual"],
  fecha: ["desde", "hasta", "igual"],
}

export const AGG_LABELS: Record<AggFn, string> = { count: "Conteo", suma: "Suma", promedio: "Promedio" }

/** Depura el config contra el catálogo (lista blanca): descarta columnas/filtros/opciones inválidas. */
export function sanitizeConfig(key: DatasetKey, raw: Partial<ReportConfig> | null | undefined): ReportConfig {
  const meta = datasetMeta(key)
  const fields = new Set(meta?.columns.map((c) => c.field))
  const columns = (raw?.columns ?? []).filter((f) => fields.has(f))
  const filters: ReportFilter[] = (raw?.filters ?? []).filter((f) => {
    const cm = columnMeta(key, f.field)
    return !!cm && OPS_BY_TYPE[cm.type].includes(f.op)
  }).map((f) => ({ field: f.field, op: f.op, value: String(f.value ?? "").slice(0, 200) }))
  const gb = raw?.groupBy && columnMeta(key, raw.groupBy)?.groupable ? raw.groupBy : null
  let aggregate = gb ? raw?.aggregate ?? { fn: "count" as AggFn } : null
  if (aggregate && (aggregate.fn === "suma" || aggregate.fn === "promedio")) {
    const cm = aggregate.field ? columnMeta(key, aggregate.field) : null
    if (!cm || cm.type !== "numero") aggregate = { fn: "count" }
  }
  const chart = gb && raw?.chart && ["barra", "linea", "torta"].includes(raw.chart) ? raw.chart : null
  const sort = raw?.sort && (fields.has(raw.sort.field) || raw.sort.field === "valor" || raw.sort.field === "group")
    ? { field: raw.sort.field, dir: raw.sort.dir === "desc" ? "desc" as const : "asc" as const }
    : undefined
  return { columns: columns.length ? columns : [...(fields ?? [])].slice(0, 4), filters, groupBy: gb, aggregate, chart, sort }
}

function matches(row: ReportRow, f: ReportFilter, type: ColumnType): boolean {
  const cell = row[f.field]
  const v = f.value.trim()
  if (v === "") return true
  if (cell === null || cell === undefined) return false
  const s = String(cell).toLowerCase()
  const q = v.toLowerCase()
  switch (f.op) {
    case "igual": return type === "numero" ? Number(cell) === Number(v) : s === q
    case "contiene": return s.includes(q)
    case "mayor_igual": return Number(cell) >= Number(v)
    case "menor_igual": return Number(cell) <= Number(v)
    case "desde": return String(cell) >= v
    case "hasta": return String(cell) <= v
    default: return true
  }
}

export function applyFilters(key: DatasetKey, rows: ReportRow[], filters: ReportFilter[]): ReportRow[] {
  if (filters.length === 0) return rows
  return rows.filter((row) => filters.every((f) => {
    const cm = columnMeta(key, f.field)
    return cm ? matches(row, f, cm.type) : true
  }))
}

export interface ReportResult {
  mode: "detalle" | "agrupado"
  columns: { field: string; label: string }[]
  rows: ReportRow[]
  total: number
  chart: { kind: ChartKind; labels: string[]; values: number[] } | null
}

function labelOf(key: DatasetKey, field: string): string {
  return columnMeta(key, field)?.label ?? field
}

export function runConfig(key: DatasetKey, allRows: ReportRow[], config: ReportConfig): ReportResult {
  const filtered = applyFilters(key, allRows, config.filters)

  if (config.groupBy) {
    const agg = config.aggregate ?? { fn: "count" as AggFn }
    const groups = new Map<string, { sum: number; n: number }>()
    for (const row of filtered) {
      const g = row[config.groupBy] === null || row[config.groupBy] === undefined ? "(sin valor)" : String(row[config.groupBy])
      const e = groups.get(g) ?? { sum: 0, n: 0 }
      e.n += 1
      if (agg.field) e.sum += Number(row[agg.field] ?? 0)
      groups.set(g, e)
    }
    const valLabel = agg.fn === "count" ? "Conteo" : `${AGG_LABELS[agg.fn]} de ${agg.field ? labelOf(key, agg.field) : ""}`.trim()
    let rows: ReportRow[] = [...groups.entries()].map(([group, e]) => ({
      group, valor: agg.fn === "count" ? e.n : agg.fn === "suma" ? Math.round(e.sum * 100) / 100 : e.n ? Math.round((e.sum / e.n) * 100) / 100 : 0,
    }))
    const dir = config.sort?.dir === "asc" ? 1 : -1
    const byField = config.sort?.field === "group" ? "group" : "valor"
    rows = rows.sort((a, b) => {
      const av = a[byField], bv = b[byField]
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return {
      mode: "agrupado",
      columns: [{ field: "group", label: labelOf(key, config.groupBy) }, { field: "valor", label: valLabel }],
      rows, total: filtered.length,
      chart: config.chart ? { kind: config.chart, labels: rows.map((r) => String(r.group)), values: rows.map((r) => Number(r.valor)) } : null,
    }
  }

  const cols = config.columns.length ? config.columns : datasetMeta(key)!.columns.map((c) => c.field)
  let rows = filtered.map((row) => Object.fromEntries(cols.map((f) => [f, row[f] ?? null])) as ReportRow)
  if (config.sort && cols.includes(config.sort.field)) {
    const field = config.sort.field, dir = config.sort.dir === "asc" ? 1 : -1
    rows = rows.sort((a, b) => {
      const av = a[field], bv = b[field]
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir
    })
  }
  return {
    mode: "detalle",
    columns: cols.map((f) => ({ field: f, label: labelOf(key, f) })),
    rows, total: filtered.length, chart: null,
  }
}
