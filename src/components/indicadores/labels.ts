import type { ComplianceStatus, IndicatorDirection, IndicatorFrequency } from "@/lib/types"

// Etiquetas y tonos del módulo Indicadores (ver design/spec-indicadores.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  cumple: "Cumple",
  en_riesgo: "En riesgo",
  no_cumple: "No cumple",
}

export const COMPLIANCE_TONE: Record<ComplianceStatus, Tone> = {
  cumple: "exito",
  en_riesgo: "advertencia",
  no_cumple: "error",
}

export const DIRECTION_LABELS: Record<IndicatorDirection, string> = {
  mayor_mejor: "Mayor es mejor",
  menor_mejor: "Menor es mejor",
  rango: "Rango",
}

export const FREQUENCY_LABELS: Record<IndicatorFrequency, string> = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
}

/** Formatea el valor con su unidad (el `%` va pegado; el resto con espacio). */
export function formatValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—"
  const n = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "")
  return unit === "%" ? `${n}%` : `${n} ${unit}`.trim()
}

/** Formatea la meta según el sentido: "≥ 95%", "≤ 3%", "40–60 pts". */
export function formatTarget(
  direction: IndicatorDirection,
  target: number,
  targetMax: number | null,
  unit: string,
): string {
  if (direction === "rango" && targetMax !== null) {
    return `${formatValue(target, unit === "%" ? "" : "")}–${formatValue(targetMax, unit)}`.replace("—", "")
  }
  const sign = direction === "mayor_mejor" ? "≥" : "≤"
  return `${sign} ${formatValue(target, unit)}`
}

/** Etiqueta legible de un periodo ISO (primer día): "nov-2026", "T1-2026" no; usamos mes-año. */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
export function formatPeriod(iso: string): string {
  const [y, m] = iso.split("-")
  const mi = Number(m) - 1
  return mi >= 0 && mi < 12 ? `${MESES[mi]}-${y}` : iso
}
