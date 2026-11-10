import { TriangleAlertIcon } from "lucide-react"

import { SEVERITY_LABELS } from "@/components/no-conformidades/labels"
import { Card } from "@/components/ui/card"
import type { NcSeverity, NcSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEV_DOT: Record<NcSeverity, string> = {
  mayor: "bg-error",
  menor: "bg-advertencia",
  observacion: "bg-superficie-alt border border-borde-fuerte",
}

/** Orientación del tablero: conteos de estado + severidad. No es protagonista. */
export function NcSummary({ summary }: { summary: NcSummary }) {
  const sev: NcSeverity[] = ["mayor", "menor", "observacion"]
  return (
    <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body">
        <span>
          <strong className="font-semibold tabular-nums">{summary.open}</strong> abiertas
        </span>
        <span className="text-texto-sec">·</span>
        <span>
          <strong className="font-semibold tabular-nums">{summary.inVerification}</strong> en verificación
        </span>
        {summary.overdueActions > 0 && (
          <span className="inline-flex items-center gap-1.5 text-error-texto">
            <TriangleAlertIcon className="size-4" aria-hidden="true" />
            <strong className="font-semibold tabular-nums">{summary.overdueActions}</strong> acciones vencidas
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-small text-texto-sec">
        {sev.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", SEV_DOT[s])} aria-hidden="true" />
            <span className="tabular-nums text-texto">{summary.bySeverity[s]}</span> {SEVERITY_LABELS[s].toLowerCase()}
          </span>
        ))}
      </div>
    </Card>
  )
}
