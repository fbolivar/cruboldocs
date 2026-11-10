import type { PqrsChannel, PqrsStatus, PqrsType, SatisfactionMethod } from "@/lib/types"

// Etiquetas, tonos y helpers del módulo PQRS (ver design/spec-pqrs.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const PQRS_STATUS_LABELS: Record<PqrsStatus, string> = {
  recibida: "Recibida",
  en_gestion: "En gestión",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  anulada: "Anulada",
}

export const PQRS_STATUS_TONE: Record<PqrsStatus, Tone> = {
  recibida: "info",
  en_gestion: "advertencia",
  resuelta: "info",
  cerrada: "exito",
  anulada: "neutro",
}

export const PQRS_TYPE_LABELS: Record<PqrsType, string> = {
  peticion: "Petición",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  felicitacion: "Felicitación",
}

export const CHANNEL_LABELS: Record<PqrsChannel, string> = {
  correo: "Correo",
  telefono: "Teléfono",
  web: "Web",
  presencial: "Presencial",
  otro: "Otro",
}

export const SATISFACTION_METHOD_LABELS: Record<SatisfactionMethod, string> = {
  encuesta: "Encuesta",
  nps: "NPS",
  csat: "CSAT",
  otro: "Otro",
}

/** Estados que cuentan como "abierto". */
export const OPEN_STATUSES: PqrsStatus[] = ["recibida", "en_gestion", "resuelta"]
export const isOpen = (s: PqrsStatus): boolean => OPEN_STATUSES.includes(s)

/** Semáforo de satisfacción por umbral (coincide con el servidor). */
export function satisfactionTone(score: number): Tone {
  return score >= 80 ? "exito" : score >= 60 ? "advertencia" : "error"
}
export function satisfactionLabel(score: number): string {
  return score >= 80 ? "Bien" : score >= 60 ? "Medio" : "Bajo"
}

export const formatScore = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2))

/** Periodo `YYYY-MM-DD` → "nov 2026". */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
export function formatPeriod(iso: string): string {
  return `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}
