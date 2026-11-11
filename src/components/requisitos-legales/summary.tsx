import { Card } from "@/components/ui/card"
import type { LegalSummary } from "@/lib/types"

/** Tres tarjetas: requisitos vigentes, no cumple, por reevaluar. */
export function LegalSummaryBar({ summary }: { summary: LegalSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Requisitos vigentes</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.active}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">No cumple</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.notMeeting > 0 ? "text-error-texto" : "text-texto"}`}>{summary.notMeeting}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Por reevaluar (30 días)</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.dueSoon > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.dueSoon}</p>
      </Card>
    </div>
  )
}
