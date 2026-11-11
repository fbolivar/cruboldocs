import { CHANGE_STATUS_LABELS, CHANGE_STATUS_TONE, CHANGE_STEPS, CHANGE_TYPE_LABELS } from "@/components/cambios/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { ChangeStatus, ChangeType } from "@/lib/types"

export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  return <Badge tone={CHANGE_STATUS_TONE[status]}>{CHANGE_STATUS_LABELS[status]}</Badge>
}

export function ChangeTypeChip({ changeType }: { changeType: ChangeType }) {
  return <Chip>{CHANGE_TYPE_LABELS[changeType]}</Chip>
}

/** Stepper del flujo 6.3: propuesto → en evaluación → aprobado → implementado (rechazado aparte). */
export function ChangeStepper({ status }: { status: ChangeStatus }) {
  if (status === "rechazado") {
    return <Badge tone="error">Rechazado</Badge>
  }
  const current = CHANGE_STEPS.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-small">
      {CHANGE_STEPS.map((st, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={st} className="flex items-center gap-1">
            <span aria-hidden="true" className={`inline-block size-2 rounded-full ${active ? "bg-acento" : done ? "bg-exito-texto" : "bg-borde-fuerte"}`} />
            <span className={active ? "font-medium text-texto" : "text-texto-sec"} aria-current={active ? "step" : undefined}>{CHANGE_STATUS_LABELS[st]}</span>
            {i < CHANGE_STEPS.length - 1 && <span aria-hidden="true" className="mx-1 text-texto-sec">›</span>}
          </li>
        )
      })}
    </ol>
  )
}
