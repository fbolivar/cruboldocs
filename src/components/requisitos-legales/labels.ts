import type { LegalCompliance, LegalFrequency, LegalSource } from "@/lib/types"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const SOURCE_LABELS: Record<LegalSource, string> = {
  ley: "Ley",
  decreto: "Decreto",
  resolucion: "Resolución",
  norma_iso: "Norma ISO",
  contractual: "Contractual",
  otro: "Otro",
}

export const COMPLIANCE_LABELS: Record<LegalCompliance, string> = {
  cumple: "Cumple",
  parcial: "Parcial",
  no_cumple: "No cumple",
  no_evaluado: "No evaluado",
}

export const COMPLIANCE_TONE: Record<LegalCompliance, Tone> = {
  cumple: "exito",
  parcial: "advertencia",
  no_cumple: "error",
  no_evaluado: "neutro",
}

export const FREQUENCY_LABELS: Record<LegalFrequency, string> = {
  semestral: "Semestral",
  anual: "Anual",
  bienal: "Bienal",
}
