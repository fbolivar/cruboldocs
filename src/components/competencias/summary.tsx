import { Card } from "@/components/ui/card"
import type { CompetencySummary } from "@/lib/types"

/** Tres tarjetas de orientación: cobertura, brechas abiertas y certificados por vencer. */
export function CompetencySummaryBar({ summary }: { summary: CompetencySummary }) {
  const tiles = [
    { label: "Cobertura", value: summary.coveragePct === null ? "—" : `${summary.coveragePct}%`, tone: "text-texto" },
    { label: "Brechas abiertas", value: String(summary.openGaps), tone: summary.openGaps > 0 ? "text-error-texto" : "text-texto" },
    { label: "Certificados por vencer", value: String(summary.certificatesDueSoon), tone: summary.certificatesDueSoon > 0 ? "text-advertencia-texto" : "text-texto" },
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
