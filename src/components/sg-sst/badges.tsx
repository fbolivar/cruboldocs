import { SST_ITEM_LABELS, SST_ITEM_TONE, SST_RATING_LABELS, SST_RATING_TONE, ratingOfScore } from "@/components/sg-sst/labels"
import { Badge } from "@/components/ui/badge"
import type { SstItemStatus, SstRating } from "@/lib/types"

export function SstRatingBadge({ rating }: { rating: SstRating }) {
  return <Badge tone={SST_RATING_TONE[rating]}>{SST_RATING_LABELS[rating]}</Badge>
}

export function ItemStatusChip({ status }: { status: SstItemStatus }) {
  return <Badge tone={SST_ITEM_TONE[status]} plain>{SST_ITEM_LABELS[status]}</Badge>
}

/** Medidor de puntaje 0–100 con semáforo por umbral (art. 28). */
export function SstScoreGauge({ score, rating }: { score: number | null; rating: SstRating | null }) {
  const value = score ?? 0
  const r = rating ?? ratingOfScore(value)
  const bar = r === "aceptable" ? "bg-exito-texto" : r === "moderado" ? "bg-advertencia-texto" : "bg-error-texto"
  const text = r === "aceptable" ? "text-exito-texto" : r === "moderado" ? "text-advertencia-texto" : "text-error-texto"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-display text-h2 tabular-nums ${text}`}>{score === null ? "—" : value.toFixed(1)}<span className="text-body text-texto-sec"> / 100</span></span>
        {score !== null && <SstRatingBadge rating={r} />}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-alt" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}
