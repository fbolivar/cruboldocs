import type { HazardClass, HazardRiskLevel } from "@/lib/types"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const CLASS_LABELS: Record<HazardClass, string> = {
  fisico: "Físico",
  quimico: "Químico",
  biologico: "Biológico",
  biomecanico: "Biomecánico",
  psicosocial: "Psicosocial",
  seguridad: "Condiciones de seguridad",
  natural: "Fenómenos naturales",
}

export const RISK_LEVEL_LABELS: Record<HazardRiskLevel, string> = {
  I: "Nivel I",
  II: "Nivel II",
  III: "Nivel III",
  IV: "Nivel IV",
}

export const RISK_LEVEL_TONE: Record<HazardRiskLevel, Tone> = {
  I: "error",
  II: "advertencia",
  III: "info",
  IV: "exito",
}

/** Interpretación GTC-45 del nivel de riesgo. */
export const RISK_LEVEL_MEANING: Record<HazardRiskLevel, string> = {
  I: "No aceptable: corrección urgente",
  II: "Aceptable con control específico",
  III: "Mejorable",
  IV: "Aceptable",
}

// Opciones GTC-45 (coinciden con los CHECK del servidor).
export const ND_OPTIONS = [
  { value: 10, label: "Muy alto (10)" },
  { value: 6, label: "Alto (6)" },
  { value: 2, label: "Medio (2)" },
  { value: 0, label: "Bajo (0)" },
]
export const NE_OPTIONS = [
  { value: 4, label: "Continua (4)" },
  { value: 3, label: "Frecuente (3)" },
  { value: 2, label: "Ocasional (2)" },
  { value: 1, label: "Esporádica (1)" },
]
export const NC_OPTIONS = [
  { value: 100, label: "Mortal (100)" },
  { value: 60, label: "Muy grave (60)" },
  { value: 25, label: "Grave (25)" },
  { value: 10, label: "Leve (10)" },
]

/** Nivel de riesgo GTC-45 a partir del NR (coincide con public.gtc45_level). */
export function gtc45Level(nr: number): HazardRiskLevel {
  return nr >= 600 ? "I" : nr >= 150 ? "II" : nr >= 40 ? "III" : "IV"
}
