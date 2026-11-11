import type { SstActionStatus, SstComponent, SstCycle, SstItemStatus, SstRating } from "@/lib/types"

export const SST_RATING_LABELS: Record<SstRating, string> = {
  critico: "Crítico",
  moderado: "Moderadamente aceptable",
  aceptable: "Aceptable",
}

export const SST_RATING_TONE: Record<SstRating, "error" | "advertencia" | "exito"> = {
  critico: "error",
  moderado: "advertencia",
  aceptable: "exito",
}

export const SST_ITEM_LABELS: Record<SstItemStatus, string> = {
  pendiente: "Pendiente",
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
}

export const SST_ITEM_TONE: Record<SstItemStatus, "neutro" | "exito" | "error"> = {
  pendiente: "neutro",
  cumple: "exito",
  no_cumple: "error",
  no_aplica: "neutro",
}

export const SST_CYCLE_LABELS: Record<SstCycle, string> = {
  planear: "I. Planear",
  hacer: "II. Hacer",
  verificar: "III. Verificar",
  actuar: "IV. Actuar",
}

export const SST_COMPONENT_LABELS: Record<SstComponent, string> = {
  recursos: "Recursos",
  gestion_integral: "Gestión integral del SG-SST",
  gestion_salud: "Gestión de la salud",
  peligros_riesgos: "Gestión de peligros y riesgos",
  gestion_amenazas: "Gestión de amenazas",
  verificacion: "Verificación del SG-SST",
  mejoramiento: "Mejoramiento",
}

export const SST_ACTION_LABELS: Record<SstActionStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
  cancelada: "Cancelada",
}

/** Clase de riesgo I–V (Decreto 1607 / tabla de riesgos). */
export const RISK_CLASSES = [
  { value: 1, label: "I (riesgo mínimo)" },
  { value: 2, label: "II (riesgo bajo)" },
  { value: 3, label: "III (riesgo medio)" },
  { value: 4, label: "IV (riesgo alto)" },
  { value: 5, label: "V (riesgo máximo)" },
]

/** Nivel aplicable (7/21/60) — espejo del `sst_tier` del servidor, solo para previsualizar. */
export function sstTier(workers: number, risk: number): number {
  if (risk >= 4) return 60
  if (workers <= 10) return 7
  if (workers <= 50) return 21
  return 60
}

/** Semáforo del puntaje (coincide con la valoración del servidor, art. 28). */
export function ratingOfScore(score: number): SstRating {
  if (score < 60) return "critico"
  if (score <= 85) return "moderado"
  return "aceptable"
}
