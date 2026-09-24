import { CheckCircle2Icon, PaperclipIcon, TriangleAlertIcon, XCircleIcon } from "lucide-react"

import { Badge, Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CONTROL_TYPE_LABELS } from "@/lib/domain/risk"
import { formatDate } from "@/lib/format"
import type { Control } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  control: Control
  canRegister: boolean
  onRegister: () => void
}

/** Card de control dentro del panel del riesgo; borde de error si está vencido. */
export function ControlCard({ control, canRegister, onRegister }: Props) {
  const last = control.lastEvidence
  return (
    <li className={cn("flex flex-col gap-2.5 rounded-md border bg-superficie p-4", control.overdue ? "border-error" : "border-borde")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{control.description}</p>
        <Chip>{CONTROL_TYPE_LABELS[control.type]}</Chip>
      </div>
      <p className="text-small text-texto-sec">
        {control.frequency} · Responsable: {control.responsiblePositionName}
      </p>

      <p className={cn("flex items-center gap-1.5 text-small", control.overdue ? "text-error-texto" : "text-texto-sec")}>
        {control.overdue && <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />}
        {control.overdue ? `Vencido desde ${formatDate(control.nextDueDate)}` : `Próxima ejecución: ${formatDate(control.nextDueDate)}`}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-small">
        <span className="text-texto-sec">Última evidencia:</span>
        {last ? (
          <>
            {last.result === "efectivo" ? (
              <Badge tone="exito" icon={<CheckCircle2Icon aria-hidden="true" />}>
                Efectivo
              </Badge>
            ) : (
              <Badge tone="error" icon={<XCircleIcon aria-hidden="true" />}>
                No efectivo
              </Badge>
            )}
            <span className="text-texto-sec">{formatDate(last.executedAt)}</span>
            {last.fileName && (
              <span className="inline-flex min-w-0 items-center gap-1 text-texto-sec">
                <PaperclipIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{last.fileName}</span>
              </span>
            )}
          </>
        ) : (
          <span className="text-texto-sec">sin registros</span>
        )}
      </div>

      {canRegister && (
        <Button size="sm" className="self-start" onClick={onRegister}>
          Registrar evidencia
        </Button>
      )}
    </li>
  )
}
