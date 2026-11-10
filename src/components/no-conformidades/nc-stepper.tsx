import { CheckIcon } from "lucide-react"

import { FLOW_STEPS } from "@/components/no-conformidades/labels"
import type { NcStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Progreso del ciclo CAPA (6 pasos). Horizontal en escritorio, vertical en móvil. */
export function NcStepper({ status }: { status: NcStatus }) {
  if (status === "anulada") {
    return <p className="text-small text-texto-sec">Esta no conformidad fue anulada.</p>
  }
  const current = FLOW_STEPS.findIndex((s) => s.key === status)
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
      {FLOW_STEPS.map((step, i) => {
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
            {i < FLOW_STEPS.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-borde md:block" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
