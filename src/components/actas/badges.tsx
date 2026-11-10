import { COMMITMENT_STATUS_LABELS, COMMITMENT_STATUS_TONE, MINUTE_STATUS_LABELS, MINUTE_STATUS_TONE } from "@/components/actas/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { CommitmentStatus, MinuteStatus } from "@/lib/types"

export function MinuteStatusBadge({ status }: { status: MinuteStatus }) {
  return <Badge tone={MINUTE_STATUS_TONE[status]}>{MINUTE_STATUS_LABELS[status]}</Badge>
}

export function MeetingTypeChip({ type }: { type: string }) {
  return <Chip className="capitalize">{type}</Chip>
}

export function CommitmentStatusBadge({ status }: { status: CommitmentStatus }) {
  return <Badge tone={COMMITMENT_STATUS_TONE[status]}>{COMMITMENT_STATUS_LABELS[status]}</Badge>
}
