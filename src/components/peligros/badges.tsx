import { CLASS_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_TONE } from "@/components/peligros/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { HazardClass, HazardRiskLevel } from "@/lib/types"

export function RiskLevelBadge({ level }: { level: HazardRiskLevel }) {
  return <Badge tone={RISK_LEVEL_TONE[level]}>{RISK_LEVEL_LABELS[level]}</Badge>
}

export function HazardClassChip({ classification }: { classification: HazardClass }) {
  return <Chip>{CLASS_LABELS[classification]}</Chip>
}
