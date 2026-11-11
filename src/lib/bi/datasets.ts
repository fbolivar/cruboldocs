// Catálogo de datasets del constructor de informes (v1.4-6). Es la LISTA BLANCA: el config de un
// informe solo puede nombrar estas columnas/operadores; nunca SQL ni tablas (ADR-097).

export type DatasetKey = "nc" | "hallazgos" | "mediciones" | "pqrs" | "proveedores" | "solicitudes"
export type ColumnType = "texto" | "numero" | "fecha" | "enum"

export interface ColumnMeta {
  field: string
  label: string
  type: ColumnType
  /** Se puede agrupar por esta columna. */
  groupable?: boolean
}

export interface DatasetMeta {
  key: DatasetKey
  label: string
  columns: ColumnMeta[]
}

export type FilterOp = "igual" | "contiene" | "mayor_igual" | "menor_igual" | "desde" | "hasta"
export type AggFn = "count" | "suma" | "promedio"
export type ChartKind = "barra" | "linea" | "torta"

export interface ReportFilter {
  field: string
  op: FilterOp
  value: string
}

export interface ReportConfig {
  columns: string[]
  filters: ReportFilter[]
  groupBy: string | null
  aggregate: { fn: AggFn; field?: string } | null
  chart: ChartKind | null
  sort?: { field: string; dir: "asc" | "desc" }
}

export type CellValue = string | number | null
export type ReportRow = Record<string, CellValue>

export const DATASETS: Record<DatasetKey, DatasetMeta> = {
  nc: {
    key: "nc", label: "No conformidades",
    columns: [
      { field: "code", label: "Código", type: "texto" },
      { field: "status", label: "Estado", type: "enum", groupable: true },
      { field: "severity", label: "Severidad", type: "enum", groupable: true },
      { field: "source", label: "Origen", type: "enum", groupable: true },
      { field: "process", label: "Proceso", type: "enum", groupable: true },
      { field: "detected_at", label: "Detectada", type: "fecha" },
    ],
  },
  hallazgos: {
    key: "hallazgos", label: "Hallazgos de auditoría",
    columns: [
      { field: "type", label: "Tipo", type: "enum", groupable: true },
      { field: "severity", label: "Severidad", type: "enum", groupable: true },
      { field: "process", label: "Proceso", type: "enum", groupable: true },
      { field: "generated_nc", label: "Generó NC", type: "enum", groupable: true },
      { field: "created_at", label: "Fecha", type: "fecha" },
    ],
  },
  mediciones: {
    key: "mediciones", label: "Mediciones de indicadores",
    columns: [
      { field: "indicator", label: "Indicador", type: "enum", groupable: true },
      { field: "period", label: "Periodo", type: "fecha" },
      { field: "value", label: "Valor", type: "numero" },
      { field: "compliance", label: "Cumplimiento", type: "enum", groupable: true },
    ],
  },
  pqrs: {
    key: "pqrs", label: "PQRS",
    columns: [
      { field: "code", label: "Código", type: "texto" },
      { field: "type", label: "Tipo", type: "enum", groupable: true },
      { field: "channel", label: "Canal", type: "enum", groupable: true },
      { field: "status", label: "Estado", type: "enum", groupable: true },
      { field: "process", label: "Proceso", type: "enum", groupable: true },
      { field: "received_date", label: "Recepción", type: "fecha" },
      { field: "due_date", label: "Vence", type: "fecha" },
    ],
  },
  proveedores: {
    key: "proveedores", label: "Proveedores",
    columns: [
      { field: "code", label: "Código", type: "texto" },
      { field: "name", label: "Nombre", type: "texto" },
      { field: "kind", label: "Tipo", type: "enum", groupable: true },
      { field: "criticality", label: "Criticidad", type: "enum", groupable: true },
      { field: "status", label: "Estado", type: "enum", groupable: true },
    ],
  },
  solicitudes: {
    key: "solicitudes", label: "Solicitudes",
    columns: [
      { field: "code", label: "Código", type: "texto" },
      { field: "flow", label: "Flujo", type: "enum", groupable: true },
      { field: "status", label: "Estado", type: "enum", groupable: true },
      { field: "created_at", label: "Radicada", type: "fecha" },
    ],
  },
}

export const DATASET_KEYS = Object.keys(DATASETS) as DatasetKey[]

export function datasetMeta(key: string): DatasetMeta | null {
  return (DATASETS as Record<string, DatasetMeta>)[key] ?? null
}

export function columnMeta(key: DatasetKey, field: string): ColumnMeta | null {
  return DATASETS[key].columns.find((c) => c.field === field) ?? null
}
