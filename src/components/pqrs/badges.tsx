import { CHANNEL_LABELS, PQRS_STATUS_LABELS, PQRS_STATUS_TONE, PQRS_TYPE_LABELS } from "@/components/pqrs/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { PqrsChannel, PqrsStatus, PqrsType } from "@/lib/types"

export function PqrsStatusBadge({ status }: { status: PqrsStatus }) {
  return <Badge tone={PQRS_STATUS_TONE[status]}>{PQRS_STATUS_LABELS[status]}</Badge>
}

export function PqrsTypeChip({ type }: { type: PqrsType }) {
  // El reclamo se resalta (puede escalar a NC); el resto neutro.
  return type === "reclamo"
    ? <Badge tone="error" plain>{PQRS_TYPE_LABELS.reclamo}</Badge>
    : <Chip>{PQRS_TYPE_LABELS[type]}</Chip>
}

export function ChannelChip({ channel }: { channel: PqrsChannel }) {
  return <Chip>{CHANNEL_LABELS[channel]}</Chip>
}
