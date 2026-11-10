import { objectiveProgressLabel, objectiveProgressTone } from "@/components/objetivos/labels"

const BAR: Record<string, string> = {
  exito: "bg-exito-texto",
  advertencia: "bg-advertencia-texto",
  error: "bg-error-texto",
  neutro: "bg-borde-fuerte",
  info: "bg-acento",
}
const TEXT: Record<string, string> = {
  exito: "text-exito-texto",
  advertencia: "text-advertencia-texto",
  error: "text-error-texto",
  neutro: "text-texto-sec",
  info: "text-acento",
}

/** Avance del objetivo 0–100 coloreado por umbral; `pct` null = sin indicadores ligados. */
export function ObjectiveProgress({ pct }: { pct: number | null }) {
  const tone = objectiveProgressTone(pct)
  const label = objectiveProgressLabel(pct)
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-small text-texto-sec" aria-label="Avance sin datos">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-borde-fuerte" /> Sin datos
      </span>
    )
  }
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="flex items-center gap-3" aria-label={`Avance ${Math.round(pct)}% (${label})`}>
      <span className={`text-small font-medium tabular-nums ${TEXT[tone]}`}>{Math.round(pct)}% · {label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-superficie-alt" role="presentation">
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
