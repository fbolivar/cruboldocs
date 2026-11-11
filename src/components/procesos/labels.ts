import type { ProcessType } from "@/lib/types"

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  estrategico: "Estratégicos",
  misional: "Misionales",
  apoyo: "Apoyo",
  evaluacion: "Evaluación",
}

/** Orden del mapa de procesos (de arriba hacia abajo). */
export const PROCESS_TYPE_ORDER: ProcessType[] = ["estrategico", "misional", "apoyo", "evaluacion"]
