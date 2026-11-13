import { INCIDENT_STATUS_LABELS } from "@/components/incidentes/labels"
import type { IncidentStatus } from "@/lib/types"

const FLOW: IncidentStatus[] = ["reportado", "en_investigacion", "cerrado"]

/** Stepper Reportado→En investigación→Cerrado. Anulado se muestra como aviso aparte. */
export function IncidentStepper({ status }: { status: IncidentStatus }) {
  if (status === "anulado") {
    return <p className="text-small text-texto-sec">Este incidente fue <span className="font-medium">anulado</span>.</p>
  }
  const current = FLOW.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
      {FLOW.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium ${
              active ? "bg-acento text-superficie" : done ? "bg-exito-suave text-exito-texto" : "bg-superficie-alt text-texto-sec"
            }`}>{done ? "✓" : i + 1}</span>
            <span className={active ? "font-medium text-texto" : "text-texto-sec"}>{INCIDENT_STATUS_LABELS[s]}</span>
            {i < FLOW.length - 1 && <span aria-hidden="true" className="text-texto-sec/50">—</span>}
          </li>
        )
      })}
    </ol>
  )
}
