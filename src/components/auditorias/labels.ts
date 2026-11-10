import type { AuditStatus, FindingSeverity, FindingType } from "@/lib/types"

// Etiquetas y tonos del módulo Auditorías (ver design/spec-auditorias.md §4).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  planificada: "Planificada",
  en_ejecucion: "En ejecución",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
}

export const AUDIT_STATUS_TONE: Record<AuditStatus, Tone> = {
  planificada: "advertencia",
  en_ejecucion: "info",
  cerrada: "exito",
  cancelada: "neutro",
}

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  no_conformidad: "No conformidad",
  observacion: "Observación",
  oportunidad_mejora: "Oportunidad de mejora",
  conformidad: "Conformidad",
}

export const FINDING_TYPE_TONE: Record<FindingType, Tone> = {
  no_conformidad: "error",
  observacion: "advertencia",
  oportunidad_mejora: "info",
  conformidad: "exito",
}

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  menor: "Menor",
  mayor: "Mayor",
}

/** Pasos del ciclo para el stepper de la ficha (en orden). */
export const AUDIT_FLOW_STEPS: { key: AuditStatus; label: string }[] = [
  { key: "planificada", label: "Planificada" },
  { key: "en_ejecucion", label: "En ejecución" },
  { key: "cerrada", label: "Cerrada" },
]
