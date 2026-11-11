import type { PartyType, Pestel, Swot } from "@/lib/types"

export const SWOT_LABELS: Record<Swot, string> = {
  fortaleza: "Fortaleza",
  debilidad: "Debilidad",
  oportunidad: "Oportunidad",
  amenaza: "Amenaza",
}

/** Tono del cuadrante: positivos (fortaleza/oportunidad) vs. a vigilar (debilidad/amenaza). */
export const SWOT_TONE: Record<Swot, "exito" | "advertencia"> = {
  fortaleza: "exito",
  oportunidad: "exito",
  debilidad: "advertencia",
  amenaza: "advertencia",
}

/** Cuestiones internas (4.1) vs externas. */
export const EXTERNAL_SWOT: Swot[] = ["oportunidad", "amenaza"]

export const PESTEL_LABELS: Record<Pestel, string> = {
  politico: "Político",
  economico: "Económico",
  social: "Social",
  tecnologico: "Tecnológico",
  ecologico: "Ecológico",
  legal: "Legal",
}

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  cliente: "Cliente",
  proveedor: "Proveedor",
  empleado: "Empleado",
  accionista: "Accionista",
  autoridad: "Autoridad",
  comunidad: "Comunidad",
  otro: "Otro",
}
