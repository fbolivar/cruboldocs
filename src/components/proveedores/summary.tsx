import { Card } from "@/components/ui/card"
import type { SupplierSummary } from "@/lib/types"

/** Tres tarjetas: aprobados, condicionados/rechazados y por reevaluar. */
export function SupplierSummaryBar({ summary }: { summary: SupplierSummary }) {
  const tiles = [
    { label: "Aprobados", value: String(summary.approved), tone: "text-exito-texto" },
    { label: "Condicionados / rechazados", value: String(summary.conditionedOrRejected), tone: summary.conditionedOrRejected > 0 ? "text-advertencia-texto" : "text-texto" },
    { label: "Por reevaluar", value: String(summary.dueForReeval), tone: summary.dueForReeval > 0 ? "text-advertencia-texto" : "text-texto" },
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
