import type { InspectionDisposition, InspectionType, CharacteristicType } from "@/lib/types"

// Etiquetas y tonos del módulo Inspecciones (design/spec-inspecciones.md, ADR-115..117).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  recepcion: "Recepción",
  proceso: "Proceso",
  final: "Final",
}

export const DISPOSITION_LABELS: Record<InspectionDisposition, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  concesion: "Concesión",
}

export const DISPOSITION_TONE: Record<InspectionDisposition, Tone> = {
  pendiente: "info",
  aceptado: "exito",
  rechazado: "error",
  concesion: "advertencia",
}

export const CHARACTERISTIC_TYPE_LABELS: Record<CharacteristicType, string> = {
  numerico: "Numérico (rango)",
  pasa_falla: "Pasa / no pasa",
}

/** Texto del criterio de una característica (rango o «pasa»). */
export function criterionText(c: { type: CharacteristicType; min?: number | null; max?: number | null; unit?: string | null }): string {
  if (c.type === "pasa_falla") return "Debe pasar"
  const u = c.unit ? ` ${c.unit}` : ""
  const min = c.min ?? null
  const max = c.max ?? null
  if (min !== null && max !== null) return `${min} – ${max}${u}`
  if (min !== null) return `≥ ${min}${u}`
  if (max !== null) return `≤ ${max}${u}`
  return "Sin rango"
}
