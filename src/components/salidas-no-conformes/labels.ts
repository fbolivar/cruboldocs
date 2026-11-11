import type { Disposition, NcOutputStatus } from "@/lib/types"

export const NC_OUTPUT_STATUS_LABELS: Record<NcOutputStatus, string> = {
  abierto: "Abierta",
  tratado: "Tratada",
  cerrado: "Cerrada",
  anulado: "Anulada",
}

export const NC_OUTPUT_STATUS_TONE: Record<NcOutputStatus, "advertencia" | "info" | "exito" | "neutro"> = {
  abierto: "advertencia",
  tratado: "info",
  cerrado: "exito",
  anulado: "neutro",
}

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  separar: "Separar / segregar",
  reproceso: "Reproceso",
  reclasificar: "Reclasificar",
  concesion: "Concesión",
  devolucion: "Devolución",
  desecho: "Desecho",
  suspender_servicio: "Suspender servicio",
}
