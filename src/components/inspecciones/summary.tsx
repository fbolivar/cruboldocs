import { Card } from "@/components/ui/card"
import type { InspectionSummary } from "@/lib/types"

/** Tres tarjetas: pendientes, rechazadas y % de aceptación (spec §2). */
export function InspectionSummaryBar({ summary }: { summary: InspectionSummary }) {
  const tiles = [
    { label: "Pendientes", value: String(summary.pending), tone: summary.pending > 0 ? "text-acento" : "text-texto" },
    { label: "Rechazadas", value: String(summary.rejected), tone: summary.rejected > 0 ? "text-error-texto" : "text-texto" },
    {
      label: "% Aceptación",
      value: summary.acceptanceRate === null ? "—" : `${summary.acceptanceRate}%`,
      tone:
        summary.acceptanceRate === null ? "text-texto-sec"
          : summary.acceptanceRate >= 90 ? "text-exito-texto"
          : summary.acceptanceRate >= 70 ? "text-advertencia-texto"
          : "text-error-texto",
    },
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
