import { RotateCcwIcon } from "lucide-react"

import {
  ACTION_STATUS_LABELS,
  ACTION_STATUS_TONE,
  SEVERITY_LABELS,
  SEVERITY_TONE,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/components/no-conformidades/labels"
import { Badge } from "@/components/ui/badge"
import type { NcActionStatus, NcSeverity, NcStatus } from "@/lib/types"

/** Badge de estado del flujo; si fue reabierta, agrega una marca aparte. */
export function NcStatusBadge({ status, reopened = false }: { status: NcStatus; reopened?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>
      {reopened && (
        <Badge tone="error" icon={<RotateCcwIcon />}>
          Reabierta
        </Badge>
      )}
    </span>
  )
}

export function NcSeverityBadge({ severity }: { severity: NcSeverity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABELS[severity]}</Badge>
}

export function NcActionStatusBadge({ status }: { status: NcActionStatus }) {
  return (
    <Badge tone={ACTION_STATUS_TONE[status]} className={status === "cancelada" ? "opacity-70" : undefined}>
      {ACTION_STATUS_LABELS[status]}
    </Badge>
  )
}
