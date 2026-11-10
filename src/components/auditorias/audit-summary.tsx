import { TriangleAlertIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import type { AuditSummary } from "@/lib/types"

/** Orientación del tablero: conteos por estado del año y hallazgos de no conformidad. */
export function AuditSummaryBar({ summary }: { summary: AuditSummary }) {
  const year = new Date().getFullYear()
  return (
    <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-body">
      <span>
        <strong className="font-semibold tabular-nums">{summary.planned}</strong> planificadas
      </span>
      <span className="text-texto-sec">·</span>
      <span>
        <strong className="font-semibold tabular-nums">{summary.inProgress}</strong> en ejecución
      </span>
      <span className="text-texto-sec">·</span>
      <span>
        <strong className="font-semibold tabular-nums">{summary.closedThisYear}</strong> cerradas ({year})
      </span>
      {summary.ncFindings > 0 && (
        <span className="inline-flex items-center gap-1.5 text-error-texto">
          <TriangleAlertIcon className="size-4" aria-hidden="true" />
          <strong className="font-semibold tabular-nums">{summary.ncFindings}</strong> hallazgos de no conformidad
        </span>
      )}
    </Card>
  )
}
