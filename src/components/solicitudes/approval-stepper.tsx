import { CheckIcon, CircleDotIcon, CircleIcon, XIcon } from "lucide-react"

import { formatDateTime } from "@/lib/format"
import type { SolicitudStepView } from "@/lib/types"

const DECISION = {
  aprobada: { icon: CheckIcon, cls: "bg-exito-suave text-exito-texto", label: "Aprobado" },
  rechazada: { icon: XIcon, cls: "bg-error-suave text-error-texto", label: "Rechazado" },
}

/** Stepper vertical de aprobación: un ítem por paso con su decisión. */
export function ApprovalStepper({ steps }: { steps: SolicitudStepView[] }) {
  return (
    <ol className="flex flex-col gap-0">
      {steps.map((s, i) => {
        const done = s.decision !== "pendiente"
        const marker = s.decision === "aprobada" ? DECISION.aprobada : s.decision === "rechazada" ? DECISION.rechazada : null
        const Icon = marker ? marker.icon : s.current ? CircleDotIcon : CircleIcon
        const cls = marker ? marker.cls : s.current ? "bg-acento-suave text-acento" : "bg-superficie-alt text-texto-sec"
        return (
          <li key={s.stepNo} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`grid size-8 place-items-center rounded-full ${cls}`}><Icon className="size-4" /></span>
              {i < steps.length - 1 && <span className="w-px flex-1 bg-borde" />}
            </div>
            <div className={`pb-5 ${s.current ? "" : ""}`}>
              <p className="text-body font-medium text-texto">{s.name}</p>
              <p className="text-caption text-texto-sec">Aprobador: {s.approverPositionName}</p>
              {marker && (
                <p className="mt-0.5 text-caption text-texto-sec">
                  {marker.label}{s.decidedByName ? ` · ${s.decidedByName}` : ""}{s.decidedAt ? ` · ${formatDateTime(s.decidedAt)}` : ""}
                </p>
              )}
              {s.comment && <p className="mt-1 rounded-md bg-superficie-alt px-2 py-1 text-small text-texto">{s.comment}</p>}
              {s.current && !done && <p className="mt-0.5 text-caption text-acento">En curso</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
