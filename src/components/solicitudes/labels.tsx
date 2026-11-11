import { Badge } from "@/components/ui/badge"
import type { SolicitudStatus } from "@/lib/types"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const SOLICITUD_STATUS_LABELS: Record<SolicitudStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  anulada: "Anulada",
}

const STATUS_TONE: Record<SolicitudStatus, Tone> = {
  pendiente: "info",
  aprobada: "exito",
  rechazada: "error",
  anulada: "neutro",
}

export function SolicitudStatusBadge({ status }: { status: SolicitudStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{SOLICITUD_STATUS_LABELS[status]}</Badge>
}
