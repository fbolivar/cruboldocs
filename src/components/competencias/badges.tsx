import {
  COMPETENCY_STATUS_GLYPH,
  COMPETENCY_STATUS_LABELS,
  COMPETENCY_STATUS_TONE,
  KIND_LABELS,
  LEVEL_LABELS,
  TRAINING_KIND_LABELS,
} from "@/components/competencias/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { CompetencyKind, CompetencyLevel, CompetencyStatus, TrainingKind } from "@/lib/types"

export function CompetencyStatusBadge({ status }: { status: CompetencyStatus }) {
  return (
    <Badge tone={COMPETENCY_STATUS_TONE[status]} icon={<span aria-hidden="true">{COMPETENCY_STATUS_GLYPH[status]}</span>}>
      {COMPETENCY_STATUS_LABELS[status]}
    </Badge>
  )
}

export function LevelChip({ level }: { level: CompetencyLevel }) {
  return <Chip title={LEVEL_LABELS[level]}>N{level} · {LEVEL_LABELS[level]}</Chip>
}

export function CompetencyKindChip({ kind }: { kind: CompetencyKind }) {
  return <Chip>{KIND_LABELS[kind]}</Chip>
}

export function TrainingKindChip({ kind }: { kind: TrainingKind }) {
  return <Chip>{TRAINING_KIND_LABELS[kind]}</Chip>
}
