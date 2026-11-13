"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Carta de control (SVG puro, sin librería — patrón indicadores ADR-014/037).
 * Dibuja la serie, la línea central y los límites (UCL/LCL); resalta los puntos marcados.
 */
export function ControlChart({
  values, labels, center, ucl, lcl, flagged, unit, title, height = 180,
}: {
  values: number[]
  labels: string[]
  center: number
  ucl: number | null
  lcl: number | null
  flagged: Set<number>
  unit: string | null
  title: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  if (values.length < 2) {
    return <p className="py-8 text-center text-small text-texto-sec">Serie demasiado corta para graficar.</p>
  }

  const W = 640
  const H = height
  const padL = 48
  const padR = 12
  const padT = 14
  const padB = 26

  const lines = [center, ...(ucl !== null ? [ucl] : []), ...(lcl !== null ? [lcl] : [])]
  const lo = Math.min(...values, ...lines)
  const hi = Math.max(...values, ...lines)
  const span = hi - lo || 1
  const yPad = span * 0.12
  const yMin = lo - yPad
  const yMax = hi + yPad
  const ySpan = yMax - yMin

  const xOf = (i: number) => padL + (i * (W - padL - padR)) / (values.length - 1)
  const yOf = (v: number) => padT + (1 - (v - yMin) / ySpan) * (H - padT - padB)
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ")
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2)}${unit ? ` ${unit}` : ""}`

  const limitLine = (v: number | null, label: string, dash: string) =>
    v === null ? null : (
      <g className="text-borde-fuerte">
        <line x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)} stroke="currentColor" strokeWidth={1} strokeDasharray={dash} opacity={0.8} />
        <text x={padL - 6} y={yOf(v) + 3} textAnchor="end" className="fill-texto-sec text-[10px]">{label}</text>
      </g>
    )

  return (
    <div className="relative w-full">
      <p className="mb-1 text-caption font-medium text-texto-sec">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${values.length} puntos, línea central ${fmt(center)}.`}>
        {limitLine(ucl, "UCL", "4 3")}
        {limitLine(lcl, "LCL", "4 3")}
        <g className="text-texto-sec">
          <line x1={padL} y1={yOf(center)} x2={W - padR} y2={yOf(center)} stroke="currentColor" strokeWidth={1} opacity={0.6} />
          <text x={padL - 6} y={yOf(center) + 3} textAnchor="end" className="fill-texto-sec text-[10px]">LC</text>
        </g>
        <path d={path} fill="none" className="text-acento" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => {
          const bad = flagged.has(i)
          return (
            <g key={i}>
              {bad && <circle cx={xOf(i)} cy={yOf(v)} r={7} className="text-error-texto" fill="none" stroke="currentColor" strokeWidth={1.5} />}
              <circle
                cx={xOf(i)} cy={yOf(v)} r={hover === i ? 5 : 3.5}
                className={cn(bad ? "text-error-texto" : "text-acento")} fill="currentColor"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} role="button"
                aria-label={`${labels[i]}: ${fmt(v)}${bad ? " (fuera de control)" : ""}`}
              />
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-borde bg-superficie px-2 py-1 text-caption shadow-sm">
          <span className="font-medium">{labels[hover]}</span>: {fmt(values[hover])}
        </div>
      )}
    </div>
  )
}
