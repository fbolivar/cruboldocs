import { CheckIcon } from "lucide-react"

import { AUDIT_FLOW_STEPS } from "@/components/auditorias/labels"
import type { AuditStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Progreso de la auditoría (3 pasos). Horizontal en escritorio, vertical en móvil. */
export function AuditStepper({ status }: { status: AuditStatus }) {
  if (status === "cancelada") {
    return <p className="text-small text-texto-sec">Esta auditoría fue cancelada.</p>
  }
  const current = AUDIT_FLOW_STEPS.findIndex((s) => s.key === status)
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
      {AUDIT_FLOW_STEPS.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.key} className="flex items-center gap-2 md:flex-1">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-caption font-medium",
                done && "bg-exito-suave text-exito-texto",
                active && "bg-acento text-superficie",
                !done && !active && "bg-superficie-alt text-texto-sec"
              )}
              aria-hidden="true"
            >
              {done ? <CheckIcon className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-small", active ? "font-medium text-texto" : "text-texto-sec")}>{step.label}</span>
            {i < AUDIT_FLOW_STEPS.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-borde md:block" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
