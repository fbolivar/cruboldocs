import { SatisfactionGauge } from "@/components/pqrs/satisfaction-gauge"
import { formatPeriod } from "@/components/pqrs/labels"
import { Card } from "@/components/ui/card"
import type { PqrsSummary } from "@/lib/types"

/** Tres tarjetas: abiertas, vencidas y satisfacción del último periodo. */
export function PqrsSummaryBar({ summary }: { summary: PqrsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Abiertas</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.open}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Vencidas</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.overdue > 0 ? "text-error-texto" : "text-texto"}`}>{summary.overdue}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">
          Satisfacción{summary.lastSatisfactionPeriod ? ` (${formatPeriod(summary.lastSatisfactionPeriod)})` : ""}
        </p>
        <p className="mt-1"><SatisfactionGauge score={summary.lastSatisfactionScore} size="lg" /></p>
      </Card>
    </div>
  )
}
