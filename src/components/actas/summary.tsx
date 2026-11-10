import { Card } from "@/components/ui/card"
import type { MinutesSummary } from "@/lib/types"

/** Tres tarjetas: actas del año, borradores y compromisos pendientes. */
export function MinutesSummaryBar({ summary }: { summary: MinutesSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Actas del año</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.totalYear}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Borradores</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.drafts}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Compromisos pendientes</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.pendingCommitments > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.pendingCommitments}</p>
      </Card>
    </div>
  )
}
