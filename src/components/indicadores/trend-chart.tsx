"use client"

import { useState } from "react"

import { COMPLIANCE_LABELS, formatPeriod, formatValue } from "@/components/indicadores/labels"
import { cn } from "@/lib/utils"
import type { ComplianceStatus, IndicatorDirection, TrendPoint } from "@/lib/types"

const POINT_COLOR: Record<ComplianceStatus, string> = {
  cumple: "text-exito-texto",
  en_riesgo: "text-advertencia-texto",
  no_cumple: "text-error-texto",
}

/**
 * Gráfica de tendencia (SVG puro, sin librería — ADR-014): línea de la serie,
 * puntos coloreados por cumplimiento, línea de meta punteada y banda para el rango.
 */
export function TrendChart({
  points,
  unit,
  direction,
  target,
  targetMax,
  height = 180,
}: {
  points: TrendPoint[]
  unit: string
  direction: IndicatorDirection
  target: number
  targetMax: number | null
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-small text-texto-sec">
        Aún no hay suficientes mediciones para la tendencia.
      </p>
    )
  }

  // viewBox fijo; el SVG se reescala al ancho del contenedor.
  const W = 640
  const H = height
  const padL = 44
  const padR = 12
  const padT = 12
  const padB = 28

  const values = points.map((p) => p.value)
  const metas = direction === "rango" && targetMax !== null ? [target, targetMax] : [target]
  const lo = Math.min(...values, ...metas)
  const hi = Math.max(...values, ...metas)
  const span = hi - lo || 1
  const yPad = span * 0.1
  const yMin = lo - yPad
  const yMax = hi + yPad
  const ySpan = yMax - yMin

  const xOf = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1)
  const yOf = (v: number) => padT + (1 - (v - yMin) / ySpan) * (H - padT - padB)

  const coords = points.map((p, i) => ({ x: xOf(i), y: yOf(p.value), p }))
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")

  const summary = `Tendencia de ${points.length} periodos, de ${formatPeriod(points[0].period)} a ${formatPeriod(
    points[points.length - 1].period,
  )}.`

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
        {/* Banda de rango (sentido rango) */}
        {direction === "rango" && targetMax !== null && (
          <rect
            x={padL}
            y={yOf(targetMax)}
            width={W - padL - padR}
            height={Math.max(0, yOf(target) - yOf(targetMax))}
            className="text-exito-suave"
            fill="currentColor"
          />
        )}
        {/* Línea(s) de meta */}
        {metas.map((m, i) => (
          <g key={i} className="text-texto-sec">
            <line x1={padL} y1={yOf(m)} x2={W - padR} y2={yOf(m)} stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            <text x={padL - 6} y={yOf(m) + 3} textAnchor="end" className="fill-texto-sec text-[10px]">
              {formatValue(m, unit === "%" ? "" : "")}
            </text>
          </g>
        ))}
        {/* Serie */}
        <path d={path} fill="none" className="text-acento" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Puntos + etiquetas de periodo */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hover === i ? 5 : 3.5}
              className={cn(POINT_COLOR[c.p.compliance])}
              fill="currentColor"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              role="button"
              aria-label={`${formatPeriod(c.p.period)}: ${formatValue(c.p.value, unit)}, ${COMPLIANCE_LABELS[c.p.compliance]}`}
            />
            <text x={c.x} y={H - 10} textAnchor="middle" className="fill-texto-sec text-[10px]">
              {formatPeriod(c.p.period).split("-")[0]}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-borde bg-superficie px-2 py-1 text-caption shadow-sm">
          <span className="font-medium">{formatPeriod(points[hover].period)}</span>: {formatValue(points[hover].value, unit)} ·{" "}
          {COMPLIANCE_LABELS[points[hover].compliance]}
        </div>
      )}
    </div>
  )
}
