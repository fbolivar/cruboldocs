import type { CommitmentStatus, MinuteStatus } from "@/lib/types"

// Etiquetas y tonos del módulo Actas (ver design/spec-actas.md, spec-ficha-acta.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const MINUTE_STATUS_LABELS: Record<MinuteStatus, string> = {
  borrador: "Borrador",
  cerrada: "Cerrada",
}

export const MINUTE_STATUS_TONE: Record<MinuteStatus, Tone> = {
  borrador: "advertencia",
  cerrada: "exito",
}

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
}

export const COMMITMENT_STATUS_TONE: Record<CommitmentStatus, Tone> = {
  pendiente: "advertencia",
  cumplido: "exito",
}
