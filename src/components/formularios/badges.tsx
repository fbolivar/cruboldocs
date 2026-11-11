import { FORM_CATEGORY_LABELS, FORM_STATUS_LABELS, FORM_STATUS_TONE } from "@/components/formularios/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { FormCategory, FormStatus } from "@/lib/types"

export function FormStatusBadge({ status, version }: { status: FormStatus; version?: number }) {
  return (
    <Badge tone={FORM_STATUS_TONE[status]}>
      {FORM_STATUS_LABELS[status]}
      {version !== undefined ? ` v${version}` : ""}
    </Badge>
  )
}

export function FormCategoryChip({ category }: { category: FormCategory }) {
  return <Chip>{FORM_CATEGORY_LABELS[category]}</Chip>
}
