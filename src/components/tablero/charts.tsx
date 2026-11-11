import { ObjectiveProgress } from "@/components/objetivos/objective-progress"
import { PERSPECTIVE_LABELS } from "@/components/objetivos/labels"
import type { DashboardData, LabeledCount } from "@/lib/types"

const BAR_TONE: Record<string, string> = {
  exito: "bg-exito-texto", advertencia: "bg-advertencia-texto", error: "bg-error-texto",
  info: "bg-acento", neutro: "bg-borde-fuerte",
}
const TEXT_TONE: Record<string, string> = {
  exito: "text-exito-texto", advertencia: "text-advertencia-texto", error: "text-error-texto",
  info: "text-acento", neutro: "text-texto-sec",
}

/** Barras horizontales: etiqueta + valor; el color es refuerzo, el dato lo da el número. */
export function HBar({ rows }: { rows: LabeledCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 md:grid-cols-[10rem_1fr_2.5rem]">
          <span className="truncate text-small text-texto-sec" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-superficie-alt" role="presentation">
            <span className={`block h-full rounded-full ${BAR_TONE[r.tone ?? "info"]}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right text-small font-medium tabular-nums text-texto">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Barra apilada 100% de cumplimiento; cada segmento con cifra + etiqueta debajo. */
export function ComplianceBar({ cumple, atRisk, notMeeting, withoutMeasurement }: {
  cumple: number; atRisk: number; notMeeting: number; withoutMeasurement: number
}) {
  const segs = [
    { label: "Cumple", value: cumple, tone: "exito" },
    { label: "En riesgo", value: atRisk, tone: "advertencia" },
    { label: "No cumple", value: notMeeting, tone: "error" },
    { label: "Sin medición", value: withoutMeasurement, tone: "neutro" },
  ].filter((s) => s.value > 0)
  const total = segs.reduce((n, s) => n + s.value, 0)
  if (total === 0) return <p className="text-small text-texto-sec">Sin indicadores activos.</p>
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-superficie-alt" role="presentation">
        {segs.map((s) => (
          <span key={s.label} className={`${BAR_TONE[s.tone]} border-r-2 border-superficie last:border-r-0`} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5 text-caption">
            <span aria-hidden className={`size-2 rounded-full ${BAR_TONE[s.tone]}`} />
            <span className={`font-medium tabular-nums ${TEXT_TONE[s.tone]}`}>{s.value}</span>
            <span className="text-texto-sec">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Avance por perspectiva BSC (orden fijo); reutiliza ObjectiveProgress (umbral o "Sin datos"). */
export function PerspectiveBars({ rows }: { rows: DashboardData["objectives"]["byPerspective"] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.perspective} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-small text-texto">{PERSPECTIVE_LABELS[r.perspective]}</span>
            <span className="text-caption text-texto-sec">{r.count} {r.count === 1 ? "objetivo" : "objetivos"}</span>
          </div>
          <ObjectiveProgress pct={r.count === 0 ? null : r.avgProgress} />
        </li>
      ))}
    </ul>
  )
}

/** Tendencia simple (sparkline) de la satisfacción; último punto marcado y etiquetado. */
export function Sparkline({ trend }: { trend: { period: string; score: number }[] }) {
  if (trend.length === 0) return <p className="text-small text-texto-sec">Aún sin mediciones de satisfacción.</p>
  const W = 240, H = 48, pad = 4
  const xs = trend.length === 1 ? [W / 2] : trend.map((_, i) => pad + (i * (W - 2 * pad)) / (trend.length - 1))
  const min = Math.min(...trend.map((t) => t.score)), max = Math.max(...trend.map((t) => t.score))
  const span = max - min || 1
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad)
  const pts = trend.map((t, i) => `${xs[i]},${y(t.score)}`).join(" ")
  const last = trend[trend.length - 1]
  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-12 flex-1" role="img" aria-label={`Tendencia de satisfacción, último ${Math.round(last.score)}`}>
        {trend.length > 1 && <polyline points={pts} fill="none" className="stroke-acento" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        <circle cx={xs[xs.length - 1]} cy={y(last.score)} r={3.5} className="fill-acento" />
      </svg>
      <span className="font-display text-h3 tabular-nums text-texto">{Math.round(last.score)}<span className="text-caption text-texto-sec">/100</span></span>
    </div>
  )
}
