import type { EnvCondition, EnvSignificance } from "@/lib/types"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const CONDITION_LABELS: Record<EnvCondition, string> = {
  normal: "Normal",
  anormal: "Anormal",
  emergencia: "Emergencia",
}

export const SIGNIFICANCE_LABELS: Record<EnvSignificance, string> = {
  significativo: "Significativo",
  no_significativo: "No significativo",
}

export const SIGNIFICANCE_TONE: Record<EnvSignificance, Tone> = {
  significativo: "error",
  no_significativo: "neutro",
}

/** Criterios 1–3 (coinciden con los CHECK del servidor). */
export const CRIT_OPTIONS = [
  { value: 1, label: "Bajo (1)" },
  { value: 2, label: "Medio (2)" },
  { value: 3, label: "Alto (3)" },
]

/** Significancia derivada (coincide con public.env_significance). */
export function envSignificance(score: number, condition: EnvCondition, hasLegal: boolean): EnvSignificance {
  return score >= 8 || condition === "emergencia" || hasLegal ? "significativo" : "no_significativo"
}
