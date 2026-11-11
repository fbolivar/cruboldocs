import { COMPLIANCE_LABELS, COMPLIANCE_TONE, SOURCE_LABELS } from "@/components/requisitos-legales/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { LegalCompliance, LegalSource } from "@/lib/types"

export function ComplianceBadge({ compliance }: { compliance: LegalCompliance }) {
  return <Badge tone={COMPLIANCE_TONE[compliance]}>{COMPLIANCE_LABELS[compliance]}</Badge>
}

export function SourceChip({ source }: { source: LegalSource }) {
  return <Chip>{SOURCE_LABELS[source]}</Chip>
}
