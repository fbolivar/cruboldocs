import { Card } from "@/components/ui/card"
import type { HazardsSummary } from "@/lib/types"

export function HazardsSummaryBar({ summary }: { summary: HazardsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Peligros activos</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.active}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Nivel I (no aceptable)</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.levelI > 0 ? "text-error-texto" : "text-texto"}`}>{summary.levelI}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Por revaluar (30 días)</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.dueSoon > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.dueSoon}</p>
      </Card>
    </div>
  )
}
