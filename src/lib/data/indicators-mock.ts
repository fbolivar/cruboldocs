// Datos de ejemplo del Módulo Indicadores (fase frontend). Misma forma que devolverá
// el backend (migración 022 + RPCs). Se reemplaza por queries.ts en la fase de backend.
import type {
  ComplianceStatus,
  IndicatorDetail,
  IndicatorDirection,
  IndicatorListItem,
  IndicatorMeasurementView,
  IndicatorSummary,
  TrendPoint,
} from "@/lib/types"

/** Cálculo de cumplimiento (espejo del que hará el RPC). Tolerancia por defecto 10%. */
export function computeCompliance(
  direction: IndicatorDirection,
  target: number,
  targetMax: number | null,
  tolerancePct: number | null,
  value: number,
): ComplianceStatus {
  const tol = (tolerancePct ?? 10) / 100
  if (direction === "mayor_mejor") {
    if (value >= target) return "cumple"
    return value >= target * (1 - tol) ? "en_riesgo" : "no_cumple"
  }
  if (direction === "menor_mejor") {
    if (value <= target) return "cumple"
    return value <= target * (1 + tol) ? "en_riesgo" : "no_cumple"
  }
  // rango
  const max = targetMax ?? target
  if (value >= target && value <= max) return "cumple"
  const margin = ((max - target) || Math.abs(target)) * tol
  if (value >= target - margin && value <= max + margin) return "en_riesgo"
  return "no_cumple"
}

type Meas = { period: string; value: number; num?: number; den?: number; note?: string; nc?: string }
type MockIndicator = {
  id: string
  code: string
  name: string
  process: string
  description: string | null
  unit: string
  direction: IndicatorDirection
  target: number
  targetMax: number | null
  tolerancePct: number | null
  frequency: IndicatorDetail["frequency"]
  owner: string | null
  isRate: boolean
  status: IndicatorDetail["status"]
  measurements: Meas[]
}

const DATA: MockIndicator[] = [
  {
    id: "i1", code: "IND-2026-003", name: "Cumplimiento de entregas a tiempo", process: "SVC",
    description: "Entregas a tiempo / entregas totales × 100", unit: "%", direction: "mayor_mejor",
    target: 95, targetMax: null, tolerancePct: 5, frequency: "mensual", owner: "Líder de Servicios", isRate: true,
    status: "activo",
    measurements: [
      { period: "2026-07-01", value: 91, num: 91, den: 100, note: "arranque del indicador" },
      { period: "2026-08-01", value: 93, num: 93, den: 100 },
      { period: "2026-09-01", value: 96, num: 96, den: 100 },
      { period: "2026-10-01", value: 97, num: 97, den: 100 },
      { period: "2026-11-01", value: 97, num: 97, den: 100 },
    ],
  },
  {
    id: "i2", code: "IND-2026-001", name: "Reprocesos en producción", process: "DS",
    description: "Porcentaje de lotes que requirieron reproceso.", unit: "%", direction: "menor_mejor",
    target: 3, targetMax: null, tolerancePct: 20, frequency: "mensual", owner: "Líder de Desarrollo", isRate: false,
    status: "activo",
    measurements: [
      { period: "2026-08-01", value: 2.5 },
      { period: "2026-09-01", value: 2.8 },
      { period: "2026-10-01", value: 3.1 },
      { period: "2026-11-01", value: 3.4, note: "pico por cambio de proveedor" },
    ],
  },
  {
    id: "i3", code: "IND-2026-005", name: "Satisfacción del cliente", process: "COM",
    description: "Promedio de la encuesta de satisfacción (1 a 5).", unit: "pts", direction: "mayor_mejor",
    target: 4.5, targetMax: null, tolerancePct: 10, frequency: "trimestral", owner: "Líder Comercial", isRate: false,
    status: "activo",
    measurements: [
      { period: "2026-01-01", value: 4.6 },
      { period: "2026-04-01", value: 4.3 },
      { period: "2026-07-01", value: 4.1, note: "demoras de soporte" },
      { period: "2026-10-01", value: 3.9, note: "encuesta Q4", nc: "NC-2026-007" },
    ],
  },
  {
    id: "i4", code: "IND-2026-002", name: "Rotación de personal", process: "TH",
    description: "Dentro del rango saludable esperado.", unit: "%", direction: "rango",
    target: 4, targetMax: 8, tolerancePct: 15, frequency: "trimestral", owner: "Líder de Talento Humano", isRate: false,
    status: "activo",
    measurements: [
      { period: "2026-01-01", value: 6 },
      { period: "2026-04-01", value: 7 },
      { period: "2026-07-01", value: 9, note: "temporada alta" },
    ],
  },
  {
    id: "i5", code: "IND-2026-004", name: "Disponibilidad del servicio TI", process: "TI",
    description: "Uptime mensual de la plataforma.", unit: "%", direction: "mayor_mejor",
    target: 99.5, targetMax: null, tolerancePct: 1, frequency: "mensual", owner: "Líder de TI", isRate: false,
    status: "archivado",
    measurements: [
      { period: "2026-09-01", value: 99.8 },
      { period: "2026-10-01", value: 99.9 },
    ],
  },
]

function trendOf(ind: MockIndicator): TrendPoint[] {
  return ind.measurements.map((m) => ({
    period: m.period,
    value: m.value,
    compliance: computeCompliance(ind.direction, ind.target, ind.targetMax, ind.tolerancePct, m.value),
  }))
}

export function listIndicatorsMock(): IndicatorListItem[] {
  return DATA.map((ind) => {
    const trend = trendOf(ind)
    const last = trend[trend.length - 1] ?? null
    return {
      id: ind.id, code: ind.code, name: ind.name, processName: ind.process, unit: ind.unit,
      direction: ind.direction, target: ind.target, targetMax: ind.targetMax, frequency: ind.frequency,
      status: ind.status,
      lastValue: last?.value ?? null,
      lastPeriod: last?.period ?? null,
      lastCompliance: last?.compliance ?? null,
      trend,
    }
  })
}

export function getIndicatorSummaryMock(): IndicatorSummary {
  const active = DATA.filter((i) => i.status === "activo")
  const vigente = "2026-11-01"
  let cumple = 0, enRiesgo = 0, noCumple = 0, sin = 0
  for (const ind of active) {
    const m = ind.measurements.find((x) => x.period === vigente)
    if (!m) { sin++; continue }
    const c = computeCompliance(ind.direction, ind.target, ind.targetMax, ind.tolerancePct, m.value)
    if (c === "cumple") cumple++
    else if (c === "en_riesgo") enRiesgo++
    else noCumple++
  }
  const measured = active.length - sin
  return {
    active: active.length,
    compliancePct: measured ? Math.round((cumple / measured) * 100) : null,
    atRisk: enRiesgo,
    notMeeting: noCumple,
    withoutMeasurement: sin,
  }
}

export function getIndicatorMock(code: string): IndicatorDetail | null {
  const ind = DATA.find((i) => i.code === code)
  if (!ind) return null
  const measurements: IndicatorMeasurementView[] = [...ind.measurements]
    .sort((a, b) => b.period.localeCompare(a.period))
    .map((m, idx) => ({
      id: `${ind.id}-m${idx}`,
      period: m.period,
      value: m.value,
      numerator: m.num ?? null,
      denominator: m.den ?? null,
      compliance: computeCompliance(ind.direction, ind.target, ind.targetMax, ind.tolerancePct, m.value),
      note: m.note ?? null,
      capturedByName: ind.owner ?? "—",
      nonconformityCode: m.nc ?? null,
    }))
  const trend = trendOf(ind)
  const last = trend[trend.length - 1] ?? null
  return {
    id: ind.id, code: ind.code, name: ind.name, processName: ind.process, description: ind.description,
    unit: ind.unit, direction: ind.direction, target: ind.target, targetMax: ind.targetMax,
    tolerancePct: ind.tolerancePct, frequency: ind.frequency, ownerName: ind.owner, isRate: ind.isRate,
    status: ind.status,
    lastCompliance: last?.compliance ?? null,
    lastPeriod: last?.period ?? null,
    measurements,
    timeline: [
      { at: "2026-07-01T10:00:00Z", actor: "Líder SIG", text: "Creó el indicador." },
      ...(last ? [{ at: `${last.period}T12:00:00Z`, actor: ind.owner ?? "Sistema", text: "Registró una medición." }] : []),
    ],
    canManage: true,
    canMeasure: true,
  }
}

/** Procesos disponibles para los Sheets (en backend vendrá de listProcesses). */
export function processOptionsMock(): { id: string; code: string }[] {
  return [...new Set(DATA.map((i) => i.process))].map((p) => ({ id: p, code: p }))
}
