import type { ObjectiveStatus, Perspective } from "@/lib/types"

// Etiquetas, tonos y helpers del módulo Objetivos / BSC (ver design/spec-objetivos.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  financiera: "Financiera",
  cliente: "Cliente",
  procesos: "Procesos internos",
  aprendizaje: "Aprendizaje y crecimiento",
}

/** Orden fijo de las 4 perspectivas del Balanced Scorecard. */
export const PERSPECTIVE_ORDER: Perspective[] = ["financiera", "cliente", "procesos", "aprendizaje"]

/** Tono sobrio por perspectiva (chip). */
export const PERSPECTIVE_TONE: Record<Perspective, Tone> = {
  financiera: "info",
  cliente: "exito",
  procesos: "advertencia",
  aprendizaje: "neutro",
}

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  activo: "Activo",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
  archivado: "Archivado",
}

export const OBJECTIVE_STATUS_TONE: Record<ObjectiveStatus, Tone> = {
  activo: "info",
  cumplido: "exito",
  no_cumplido: "error",
  archivado: "neutro",
}

/** Semáforo del avance por umbral (coincide con el servidor); null = sin indicadores ligados. */
export function objectiveProgressTone(pct: number | null): Tone {
  if (pct === null) return "neutro"
  return pct >= 80 ? "exito" : pct >= 60 ? "advertencia" : "error"
}

export function objectiveProgressLabel(pct: number | null): string {
  if (pct === null) return "Sin datos"
  return pct >= 80 ? "Bien" : pct >= 60 ? "Medio" : "Bajo"
}
