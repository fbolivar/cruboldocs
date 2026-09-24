import { BookOpenCheckIcon, CheckIcon, ClockIcon } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import type { ReadAcknowledgement } from "@/lib/types"

interface ReadProgressProps {
  readRequired: boolean
  reads: ReadAcknowledgement[]
}

/** Confirmaciones de lectura de la versión: barra de progreso + pendientes y confirmados. */
export function ReadProgress({ readRequired, reads }: ReadProgressProps) {
  if (!readRequired) {
    return <EmptyState icon={BookOpenCheckIcon} title="Este documento no requiere confirmar lectura." className="py-8" />
  }
  if (reads.length === 0) {
    return (
      <EmptyState
        icon={BookOpenCheckIcon}
        title="La lectura se confirma cuando esta versión entra en vigencia."
        className="py-8"
      />
    )
  }
  const done = reads.filter((r) => r.acknowledgedAt !== null)
  const pending = reads.filter((r) => r.acknowledgedAt === null)
  const pct = Math.round((done.length / reads.length) * 100)
  const label = `${done.length} de ${reads.length} confirmaron`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-medium">{label}</p>
        <div
          role="progressbar"
          aria-label="Lecturas confirmadas"
          aria-valuemin={0}
          aria-valuemax={reads.length}
          aria-valuenow={done.length}
          aria-valuetext={label}
          className="h-2 w-full overflow-hidden rounded-full bg-superficie-alt"
        >
          <div className="h-full rounded-full bg-exito" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-label text-texto-sec">Pendientes ({pending.length})</h3>
          {pending.length === 0 ? (
            <p className="text-small text-texto-sec">Todos confirmaron la lectura.</p>
          ) : (
            <ul className="flex flex-col">
              {pending.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 border-t border-borde py-2 first:border-t-0">
                  <ClockIcon className="size-4 shrink-0 text-advertencia-texto" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    {r.userName} <span className="text-texto-sec">· {r.positionName}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-label text-texto-sec">Confirmados ({done.length})</h3>
          {done.length === 0 ? (
            <p className="text-small text-texto-sec">Nadie ha confirmado todavía.</p>
          ) : (
            <ul className="flex flex-col">
              {done.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 border-t border-borde py-2 first:border-t-0">
                  <CheckIcon className="size-4 shrink-0 text-exito-texto" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    {r.userName} <span className="text-texto-sec">· {r.positionName}</span>
                  </span>
                  <span className="text-small text-texto-sec">{formatDate(r.acknowledgedAt as string)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
