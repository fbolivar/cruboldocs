import { OUTPUT_KIND_LABELS, REVIEW_STATUS_LABELS, REVIEW_STATUS_TONE } from "@/components/revisiones/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { ReviewOutputKind, ReviewStatus } from "@/lib/types"

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={REVIEW_STATUS_TONE[status]}>{REVIEW_STATUS_LABELS[status]}</Badge>
}

export function OutputKindChip({ kind }: { kind: ReviewOutputKind }) {
  return <Chip>{OUTPUT_KIND_LABELS[kind]}</Chip>
}
