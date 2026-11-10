import { COMPETENCY_STATUS_GLYPH, COMPETENCY_STATUS_LABELS, COMPETENCY_STATUS_TONE, levelFraction } from "@/components/competencias/labels"
import type { MatrixCell } from "@/lib/types"

const DOT: Record<string, string> = {
  exito: "text-exito-texto",
  advertencia: "text-advertencia-texto",
  error: "text-error-texto",
  neutro: "text-texto-sec",
  info: "text-acento",
}

/** Celda de la matriz: glifo de estado + nivel evaluado/requerido. Vacía si la competencia no aplica. */
export function CompetencyStatusCell({ cell }: { cell: MatrixCell | null }) {
  if (!cell) return <span className="text-texto-sec/50" aria-label="No aplica">·</span>
  const tone = COMPETENCY_STATUS_TONE[cell.status]
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums" aria-label={COMPETENCY_STATUS_LABELS[cell.status]}>
      <span aria-hidden="true" className={`font-medium ${DOT[tone]}`}>{COMPETENCY_STATUS_GLYPH[cell.status]}</span>
      <span className="text-caption text-texto-sec">{levelFraction(cell.assessedLevel, cell.requiredLevel)}</span>
    </span>
  )
}
