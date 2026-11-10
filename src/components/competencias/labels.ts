import type {
  AssessedLevel,
  CompetencyKind,
  CompetencyLevel,
  CompetencyStatus,
  MatrixRow,
  TrainingKind,
  TrainingResult,
} from "@/lib/types"

// Etiquetas, tonos y helpers del módulo Competencias (ver design/spec-competencias.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const COMPETENCY_STATUS_LABELS: Record<CompetencyStatus, string> = {
  cumple: "Cumple",
  brecha: "Brecha",
  brecha_en_plan: "Brecha en plan",
  sin_evaluar: "Sin evaluar",
}

export const COMPETENCY_STATUS_TONE: Record<CompetencyStatus, Tone> = {
  cumple: "exito",
  brecha: "error",
  brecha_en_plan: "advertencia",
  sin_evaluar: "neutro",
}

/** Glifo del estado (nunca color solo): refuerza el badge/celda. */
export const COMPETENCY_STATUS_GLYPH: Record<CompetencyStatus, string> = {
  cumple: "✓",
  brecha: "✗",
  brecha_en_plan: "▲",
  sin_evaluar: "—",
}

export const LEVEL_LABELS: Record<CompetencyLevel, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Avanzado",
}

export const KIND_LABELS: Record<CompetencyKind, string> = {
  educacion: "Educación",
  formacion: "Formación",
  habilidad: "Habilidad",
  experiencia: "Experiencia",
}

export const TRAINING_KIND_LABELS: Record<TrainingKind, string> = {
  interna: "Interna",
  externa: "Externa",
}

export const RESULT_LABELS: Record<TrainingResult, string> = {
  aprobado: "Aprobado",
  no_aprobado: "No aprobado",
  asistio: "Asistió",
}

/** Nivel evaluado/requerido para la celda, p. ej. "2/3"; sin evaluar → "—/3". */
export function levelFraction(assessed: AssessedLevel | null, required: CompetencyLevel): string {
  return `${assessed == null || assessed === 0 ? "—" : assessed}/${required}`
}

/**
 * Deriva el estado de una competencia (espejo del futuro servidor): cumple si evaluado ≥ requerido;
 * si hay evaluación por debajo y plan declarado → brecha_en_plan; si no → brecha; sin evaluación → sin_evaluar.
 */
export function deriveStatus(assessed: AssessedLevel | null, required: CompetencyLevel, hasPlan: boolean): CompetencyStatus {
  if (assessed == null) return "sin_evaluar"
  if (assessed >= required) return "cumple"
  return hasPlan ? "brecha_en_plan" : "brecha"
}

/** Cobertura: % de competencias (celdas con requisito) en estado "cumple" sobre el total requerido. */
export function coveragePct(rows: MatrixRow[]): number | null {
  let required = 0
  let met = 0
  for (const r of rows) {
    for (const c of r.cells) {
      required++
      if (c.status === "cumple") met++
    }
  }
  return required === 0 ? null : Math.round((met * 100) / required)
}
