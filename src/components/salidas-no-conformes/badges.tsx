import { DISPOSITION_LABELS, NC_OUTPUT_STATUS_LABELS, NC_OUTPUT_STATUS_TONE } from "@/components/salidas-no-conformes/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { Disposition, NcOutputStatus } from "@/lib/types"

export function NcOutputStatusBadge({ status }: { status: NcOutputStatus }) {
  return <Badge tone={NC_OUTPUT_STATUS_TONE[status]}>{NC_OUTPUT_STATUS_LABELS[status]}</Badge>
}

export function DispositionChip({ disposition }: { disposition: Disposition }) {
  return <Chip>{DISPOSITION_LABELS[disposition]}</Chip>
}
