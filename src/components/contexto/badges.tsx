import { PARTY_TYPE_LABELS, PESTEL_LABELS, SWOT_LABELS, SWOT_TONE } from "@/components/contexto/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { PartyType, Pestel, Swot } from "@/lib/types"

export function SwotBadge({ swot }: { swot: Swot }) {
  return <Badge tone={SWOT_TONE[swot]}>{SWOT_LABELS[swot]}</Badge>
}

export function PestelChip({ pestel }: { pestel: Pestel }) {
  return <Chip>{PESTEL_LABELS[pestel]}</Chip>
}

export function PartyTypeChip({ type }: { type: PartyType }) {
  return <Chip>{PARTY_TYPE_LABELS[type]}</Chip>
}
