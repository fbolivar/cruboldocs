import { Card } from "@/components/ui/card"
import type { IncidentSummary } from "@/lib/types"

/** Tres tarjetas: abiertos, accidentes e investigaciones vencidas (spec §2). */
export function IncidentSummaryBar({ summary }: { summary: IncidentSummary }) {
  const tiles = [
    { label: "Abiertos", value: String(summary.open), tone: summary.open > 0 ? "text-acento" : "text-texto" },
    { label: "Accidentes", value: String(summary.accidents), tone: summary.accidents > 0 ? "text-advertencia-texto" : "text-texto" },
    { label: "Investigaciones vencidas", value: String(summary.overdueInvestigations), tone: summary.overdueInvestigations > 0 ? "text-error-texto" : "text-texto" },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <p className="text-caption text-texto-sec">{t.label}</p>
          <p className={`mt-1 font-display text-h2 tabular-nums ${t.tone}`}>{t.value}</p>
        </Card>
      ))}
    </div>
  )
}
