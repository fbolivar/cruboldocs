import type {
  EvaluationResult,
  SupplierCriticality,
  SupplierKind,
  SupplierStatus,
} from "@/lib/types"

// Etiquetas, tonos y cálculo del módulo Proveedores (ver design/spec-proveedores.md, ADR-025).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  condicionado: "Condicionado",
  rechazado: "Rechazado",
  inactivo: "Inactivo",
}

export const SUPPLIER_STATUS_TONE: Record<SupplierStatus, Tone> = {
  pendiente: "info",
  aprobado: "exito",
  condicionado: "advertencia",
  rechazado: "error",
  inactivo: "neutro",
}

export const CRITICALITY_LABELS: Record<SupplierCriticality, string> = {
  alta: "Crítico alto",
  media: "Crítico medio",
  baja: "Crítico bajo",
}

export const KIND_LABELS: Record<SupplierKind, string> = {
  bien: "Bien",
  servicio: "Servicio",
  ambos: "Bien y servicio",
}

export const RESULT_LABELS: Record<EvaluationResult, string> = {
  aprobado: "Aprobado",
  condicionado: "Condicionado",
  rechazado: "Rechazado",
}

export const RESULT_TONE: Record<EvaluationResult, Tone> = {
  aprobado: "exito",
  condicionado: "advertencia",
  rechazado: "error",
}

/** Criterios fijos y pesos (ADR-025). La suma de pesos es 100. */
export const CRITERIA = [
  { key: "quality", label: "Calidad", weight: 50 },
  { key: "delivery", label: "Cumplimiento / entrega", weight: 30 },
  { key: "service", label: "Servicio / precio", weight: 20 },
] as const

/** Umbrales: ≥80 aprobado, 60–79 condicionado, <60 rechazado. */
export const THRESHOLD_APPROVED = 80
export const THRESHOLD_CONDITIONED = 60

export interface EvaluationScores {
  quality: number
  delivery: number
  service: number
}

/** Puntaje total y resultado (espejo exacto del cálculo del servidor, ADR-025). */
export function estimateEvaluation(s: EvaluationScores): { total: number; result: EvaluationResult } {
  const total = Math.round((s.quality * 50 + s.delivery * 30 + s.service * 20) / 100 * 100) / 100
  const result: EvaluationResult =
    total >= THRESHOLD_APPROVED ? "aprobado" : total >= THRESHOLD_CONDITIONED ? "condicionado" : "rechazado"
  return { total, result }
}

/** Color del medidor de puntaje por umbral. */
export function scoreTone(total: number): Tone {
  return total >= THRESHOLD_APPROVED ? "exito" : total >= THRESHOLD_CONDITIONED ? "advertencia" : "error"
}

export const formatScore = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2))
