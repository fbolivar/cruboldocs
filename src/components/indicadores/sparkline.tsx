import { formatPeriod, formatValue } from "@/components/indicadores/labels"
import { cn } from "@/lib/utils"
import type { ComplianceStatus, TrendPoint } from "@/lib/types"

const POINT_COLOR: Record<ComplianceStatus, string> = {
  cumple: "text-exito-texto",
  en_riesgo: "text-advertencia-texto",
  no_cumple: "text-error-texto",
}

/**
 * Mini-tendencia (SVG puro, sin librería — ADR-014). Dibuja la serie de valores
 * normalizada; el último punto se colorea según su cumplimiento.
 */
export function Sparkline({
  points,
  unit,
  width = 72,
  height = 24,
}: {
  points: TrendPoint[]
  unit: string
  width?: number
  height?: number
}) {
  if (points.length < 2) {
    return <span className="text-caption text-texto-sec">—</span>
  }
  const pad = 3
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = (width - pad * 2) / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (p.value - min) / span) * (height - pad * 2)
    return { x, y, p }
  })
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")
  const last = coords[coords.length - 1]
  const label = `Tendencia de ${points.length} periodos; último ${formatValue(last.p.value, unit)} en ${formatPeriod(last.p.period)}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 text-acento"
      role="img"
      aria-label={label}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.5} className={cn(POINT_COLOR[last.p.compliance])} fill="currentColor" />
    </svg>
  )
}
