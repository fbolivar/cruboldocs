import { InboxIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import type { BadgeTone } from "@/lib/domain/documents"
import { formatDate } from "@/lib/format"
import type { ChangeRequest, ChangeRequestStatus } from "@/lib/types"

const STATUS: Record<ChangeRequestStatus, { label: string; tone: BadgeTone }> = {
  abierta: { label: "Abierta", tone: "advertencia" },
  aceptada: { label: "Aceptada", tone: "exito" },
  rechazada: { label: "Rechazada", tone: "neutro" },
}

/** Solicitudes de actualización del documento: motivo, solicitante, estado y resolución. */
export function ChangeRequestList({ requests }: { requests: ChangeRequest[] }) {
  if (requests.length === 0) {
    return <EmptyState icon={InboxIcon} title="No hay solicitudes de actualización." className="py-8" />
  }
  return (
    <ul className="flex flex-col">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 border-t border-borde py-4 first:border-t-0 first:pt-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-small text-texto-sec">
              <span className="font-medium text-texto">{r.requestedBy.fullName}</span> · {r.requestedBy.positionName} ·{" "}
              {formatDate(r.createdAt)}
            </p>
            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
          </div>
          <p className="text-body-lg">{r.reason}</p>
          {r.resolution && (
            <p className="rounded-sm bg-fondo px-3 py-2 text-small">
              <span className="text-texto-sec">Resolución{r.resolvedBy ? ` de ${r.resolvedBy.fullName}` : ""}: </span>
              {r.resolution}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
