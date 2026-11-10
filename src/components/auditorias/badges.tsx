import {
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_TONE,
  FINDING_SEVERITY_LABELS,
  FINDING_TYPE_LABELS,
  FINDING_TYPE_TONE,
} from "@/components/auditorias/labels"
import { Badge } from "@/components/ui/badge"
import type { AuditStatus, FindingSeverity, FindingType } from "@/lib/types"

export function AuditStatusBadge({ status }: { status: AuditStatus }) {
  return <Badge tone={AUDIT_STATUS_TONE[status]}>{AUDIT_STATUS_LABELS[status]}</Badge>
}

/** Tipo de hallazgo; la no conformidad muestra su severidad. */
export function FindingTypeBadge({ type, severity }: { type: FindingType; severity?: FindingSeverity | null }) {
  const label =
    type === "no_conformidad" && severity ? `${FINDING_TYPE_LABELS[type]} · ${FINDING_SEVERITY_LABELS[severity]}` : FINDING_TYPE_LABELS[type]
  return <Badge tone={FINDING_TYPE_TONE[type]}>{label}</Badge>
}
