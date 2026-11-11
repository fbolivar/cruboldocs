import { Card } from "@/components/ui/card"
import type { EnvAspectsSummary } from "@/lib/types"

export function EnvSummaryBar({ summary }: { summary: EnvAspectsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Aspectos activos</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.active}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Significativos</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.significant > 0 ? "text-error-texto" : "text-texto"}`}>{summary.significant}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Por revisar (30 días)</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.dueSoon > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.dueSoon}</p>
      </Card>
    </div>
  )
}
