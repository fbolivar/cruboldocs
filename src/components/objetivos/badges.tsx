import { OBJECTIVE_STATUS_LABELS, OBJECTIVE_STATUS_TONE, PERSPECTIVE_LABELS, PERSPECTIVE_TONE } from "@/components/objetivos/labels"
import { Badge } from "@/components/ui/badge"
import type { ObjectiveStatus, Perspective } from "@/lib/types"

export function ObjectiveStatusBadge({ status }: { status: ObjectiveStatus }) {
  return <Badge tone={OBJECTIVE_STATUS_TONE[status]}>{OBJECTIVE_STATUS_LABELS[status]}</Badge>
}

export function PerspectiveChip({ perspective }: { perspective: Perspective }) {
  return <Badge tone={PERSPECTIVE_TONE[perspective]} plain>{PERSPECTIVE_LABELS[perspective]}</Badge>
}
