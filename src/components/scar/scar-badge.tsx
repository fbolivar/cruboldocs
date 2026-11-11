import { Badge } from "@/components/ui/badge"
import type { ScarStatus } from "@/lib/types"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const SCAR_STATUS_LABELS: Record<ScarStatus, string> = {
  enviada: "Enviada",
  respondida: "Respondida",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  anulada: "Anulada",
}

const TONE: Record<ScarStatus, Tone> = {
  enviada: "info", respondida: "advertencia", aceptada: "exito", rechazada: "error", anulada: "neutro",
}

export function ScarStatusBadge({ status }: { status: ScarStatus }) {
  return <Badge tone={TONE[status]}>{SCAR_STATUS_LABELS[status]}</Badge>
}
