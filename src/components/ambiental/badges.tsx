import { CONDITION_LABELS, SIGNIFICANCE_LABELS, SIGNIFICANCE_TONE } from "@/components/ambiental/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { EnvCondition, EnvSignificance } from "@/lib/types"

export function SignificanceBadge({ significance }: { significance: EnvSignificance }) {
  return <Badge tone={SIGNIFICANCE_TONE[significance]}>{SIGNIFICANCE_LABELS[significance]}</Badge>
}

export function ConditionChip({ condition }: { condition: EnvCondition }) {
  return condition === "emergencia"
    ? <Badge tone="error" plain>{CONDITION_LABELS.emergencia}</Badge>
    : <Chip>{CONDITION_LABELS[condition]}</Chip>
}
