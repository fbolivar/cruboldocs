import { Card } from "@/components/ui/card"
import type { IndicatorSummary } from "@/lib/types"

/** Cuatro tarjetas de orientación: activos, % que cumplen, en riesgo y no cumplen (periodo vigente). */
export function IndicatorSummaryBar({ summary }: { summary: IndicatorSummary }) {
  const tiles = [
    { label: "Indicadores activos", value: String(summary.active), tone: "text-texto" },
    { label: "Cumplen este periodo", value: summary.compliancePct === null ? "—" : `${summary.compliancePct}%`, tone: "text-exito-texto" },
    { label: "En riesgo", value: String(summary.atRisk), tone: "text-advertencia-texto" },
    { label: "No cumplen", value: String(summary.notMeeting), tone: "text-error-texto" },
  ]
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-caption text-texto-sec">{t.label}</p>
            <p className={`mt-1 font-display text-h2 tabular-nums ${t.tone}`}>{t.value}</p>
          </Card>
        ))}
      </div>
      {summary.withoutMeasurement > 0 && (
        <p className="mt-1.5 text-caption text-texto-sec">
          {summary.withoutMeasurement} sin medición este periodo (no cuentan en el porcentaje).
        </p>
      )}
    </div>
  )
}
