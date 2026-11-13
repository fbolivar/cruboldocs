import { DISPOSITION_LABELS, DISPOSITION_TONE, INSPECTION_TYPE_LABELS } from "@/components/inspecciones/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { InspectionDisposition, InspectionType } from "@/lib/types"

export function DispositionBadge({ disposition }: { disposition: InspectionDisposition }) {
  return <Badge tone={DISPOSITION_TONE[disposition]}>{DISPOSITION_LABELS[disposition]}</Badge>
}

export function InspectionTypeChip({ type }: { type: InspectionType }) {
  return <Chip>{INSPECTION_TYPE_LABELS[type]}</Chip>
}

/** Semáforo de criterio con texto, nunca solo color (tokens.md §2). */
export function CriterionDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-caption font-medium ${ok ? "text-exito-texto" : "text-error-texto"}`}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {ok ? "Cumple" : "No cumple"}
    </span>
  )
}
