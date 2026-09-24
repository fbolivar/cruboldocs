import { relativeDateTime } from "@/lib/format"
import type { ActivityEvent } from "@/lib/types"

/** Línea de tiempo compacta de eventos del registro de auditoría (reutilizable en Admin/Auditoría). */
export function ActivityFeed({ events, now = new Date() }: { events: ActivityEvent[]; now?: Date }) {
  if (events.length === 0) return <p className="py-3 text-small text-texto-sec">Aún no hay actividad reciente.</p>
  return (
    <ol className="flex flex-col text-small">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-0.5 border-t border-borde py-3 first:border-t-0 md:flex-row md:gap-3">
          <time dateTime={e.at} className="shrink-0 text-texto-sec tabular-nums md:w-24">
            {relativeDateTime(e.at, now)}
          </time>
          <span className="min-w-0">
            <span className="font-medium">{e.actorName}</span> {e.description}
            {e.entityCode && <span className="font-mono"> {e.entityCode}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
