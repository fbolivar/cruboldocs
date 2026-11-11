import type { ChangeStatus, ChangeType } from "@/lib/types"

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  propuesto: "Propuesto",
  en_evaluacion: "En evaluación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  implementado: "Implementado",
}

export const CHANGE_STATUS_TONE: Record<ChangeStatus, "neutro" | "advertencia" | "info" | "error" | "exito"> = {
  propuesto: "neutro",
  en_evaluacion: "advertencia",
  aprobado: "info",
  rechazado: "error",
  implementado: "exito",
}

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  proceso: "Proceso",
  documento: "Documento",
  infraestructura: "Infraestructura",
  tecnologico: "Tecnológico",
  organizacional: "Organizacional",
  otro: "Otro",
}

/** Pasos del flujo (6.3), en orden; «rechazado» se muestra aparte. */
export const CHANGE_STEPS: ChangeStatus[] = ["propuesto", "en_evaluacion", "aprobado", "implementado"]
