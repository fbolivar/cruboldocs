import { formatScore, scoreTone } from "@/components/proveedores/labels"

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

/** Medidor de puntaje 0–100 coloreado por umbral. `total` null = sin evaluar. */
export function ScoreMeter({ total }: { total: number | null }) {
  if (total === null) {
    return <p className="text-small text-texto-sec">Sin puntaje (proveedor pendiente de evaluación).</p>
  }
  const tone = scoreTone(total)
  const pct = Math.max(0, Math.min(100, total))
  return (
    <div className="flex items-center gap-3" aria-label={`Puntaje ${formatScore(total)} de 100`}>
      <span className={`font-display text-h2 tabular-nums ${TEXT[tone]}`}>{formatScore(total)}<span className="text-small text-texto-sec">/100</span></span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-superficie-alt" role="presentation">
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
