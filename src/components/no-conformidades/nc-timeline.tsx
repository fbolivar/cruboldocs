import { formatDate } from "@/lib/format"
import type { NcTimelineEvent } from "@/lib/types"

/** Trazabilidad de la no conformidad (solo lectura, desde la auditoría del módulo). */
export function NcTimeline({ events }: { events: NcTimelineEvent[] }) {
  if (events.length === 0) return <p className="text-small text-texto-sec">Sin eventos todavía.</p>
  return (
    <ol className="flex flex-col gap-3">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-borde-fuerte" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-small text-texto">{e.text}</p>
            <p className="text-caption text-texto-sec">
              {formatDate(e.at)} · {e.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
