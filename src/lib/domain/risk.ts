import type { ControlType, RiskLevel } from "@/lib/types"

export const PROBABILITY_LABELS = ["Rara", "Improbable", "Posible", "Probable", "Casi segura"] as const
export const IMPACT_LABELS = ["Insignificante", "Menor", "Moderado", "Mayor", "Catastrófico"] as const

export const RISK_LEVELS: RiskLevel[] = ["extremo", "alto", "moderado", "bajo"]

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  bajo: "Bajo",
  moderado: "Moderado",
  alto: "Alto",
  extremo: "Extremo",
}

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  preventivo: "Preventivo",
  detectivo: "Detectivo",
  correctivo: "Correctivo",
}

/** Umbrales por defecto (`organizations.risk_scale`): 1–4 bajo, 5–9 moderado, 10–16 alto, 20–25 extremo. */
export interface RiskScale {
  moderadoFrom: number
  altoFrom: number
  extremoFrom: number
}

export const DEFAULT_RISK_SCALE: RiskScale = { moderadoFrom: 5, altoFrom: 10, extremoFrom: 20 }

export function riskScore(probability: number, impact: number): number {
  if (![probability, impact].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) {
    throw new RangeError("Probabilidad e impacto deben ser enteros entre 1 y 5")
  }
  return probability * impact
}

export function riskLevel(score: number, scale: RiskScale = DEFAULT_RISK_SCALE): RiskLevel {
  if (score >= scale.extremoFrom) return "extremo"
  if (score >= scale.altoFrom) return "alto"
  if (score >= scale.moderadoFrom) return "moderado"
  return "bajo"
}

/** Clases de token para fondo y texto de cada nivel (contraste AA verificado en tokens.md). */
export const RISK_LEVEL_CLASSES: Record<RiskLevel, string> = {
  bajo: "bg-riesgo-bajo text-texto",
  moderado: "bg-riesgo-moderado text-texto",
  alto: "bg-riesgo-alto text-texto",
  extremo: "bg-riesgo-extremo text-superficie",
}
