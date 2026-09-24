import { RiskHeatmap } from "@/components/riesgos/risk-heatmap"
import { RiskSummary } from "@/components/riesgos/risk-summary"
import { Card } from "@/components/ui/card"
import { SectionError } from "@/components/ui/section-error"
import type { RiskMatrix } from "@/lib/types"

/** Matriz protagonista + resumen. Si la consulta falla, solo esta sección degrada. */
export function RiskMatrixSection({ matrix, activeCell }: { matrix: RiskMatrix | null; activeCell?: string }) {
  if (!matrix) return <SectionError title="No pudimos cargar los riesgos." description="La matriz no está disponible en este momento." />

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <Card className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-h3">Matriz de calor · valoración {matrix.kind}</h2>
          <p className="hidden text-small text-texto-sec md:block">Clic en una celda para filtrar la lista</p>
        </div>
        <RiskHeatmap counts={matrix.counts} activeCell={activeCell} />
      </Card>
      <RiskSummary matrix={matrix} />
    </div>
  )
}
