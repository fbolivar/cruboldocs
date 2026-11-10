import { formatScore, satisfactionLabel, satisfactionTone } from "@/components/pqrs/labels"

const TEXT: Record<string, string> = {
  exito: "text-exito-texto",
  advertencia: "text-advertencia-texto",
  error: "text-error-texto",
  neutro: "text-texto-sec",
  info: "text-acento",
}

/** Puntaje de satisfacción 0–100 con semáforo por umbral. `score` null = sin medición. */
export function SatisfactionGauge({ score, size = "sm" }: { score: number | null; size?: "sm" | "lg" }) {
  if (score === null) return <span className="text-small text-texto-sec">Sin medición</span>
  const tone = satisfactionTone(score)
  const num = size === "lg" ? "text-h2" : "text-body"
  return (
    <span className="inline-flex items-center gap-2 tabular-nums" aria-label={`Satisfacción ${formatScore(score)} de 100, ${satisfactionLabel(score)}`}>
      <span className={`font-display ${num} ${TEXT[tone]}`}>{formatScore(score)}<span className="text-small text-texto-sec">/100</span></span>
      <span className={`inline-flex items-center gap-1 text-small ${TEXT[tone]}`}>
        <span aria-hidden="true" className="size-2 rounded-full bg-current" /> {satisfactionLabel(score)}
      </span>
    </span>
  )
}
