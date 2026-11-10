import { COMPLIANCE_LABELS, COMPLIANCE_TONE } from "@/components/indicadores/labels"
import { Badge } from "@/components/ui/badge"
import type { ComplianceStatus } from "@/lib/types"

/** Estado de cumplimiento del periodo; null = sin medición (tono neutro). */
export function ComplianceBadge({ status }: { status: ComplianceStatus | null }) {
  if (!status) return <Badge tone="neutro">Sin medición</Badge>
  return <Badge tone={COMPLIANCE_TONE[status]}>{COMPLIANCE_LABELS[status]}</Badge>
}
