import type { NcActionStatus, NcActionType, NcSeverity, NcSource, NcStatus } from "@/lib/types"

// Etiquetas y tonos del módulo No Conformidades (ver design/spec-no-conformidades.md §4).
// El tono mapea a los `tone` del Badge (exito/advertencia/error/info/neutro).

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const SOURCE_LABELS: Record<NcSource, string> = {
  auditoria_interna: "Auditoría interna",
  auditoria_externa: "Auditoría externa",
  queja_pqrs: "Queja / PQRS",
  producto_servicio: "Producto o servicio",
  riesgo_materializado: "Riesgo materializado",
  mejora: "Mejora",
  otro: "Otro",
}

export const SEVERITY_LABELS: Record<NcSeverity, string> = {
  observacion: "Observación",
  menor: "Menor",
  mayor: "Mayor",
}

export const SEVERITY_TONE: Record<NcSeverity, Tone> = {
  observacion: "neutro",
  menor: "advertencia",
  mayor: "error",
}

export const STATUS_LABELS: Record<NcStatus, string> = {
  abierta: "Abierta",
  analisis_causa: "Análisis de causa",
  plan_accion: "Plan de acción",
  en_ejecucion: "En ejecución",
  verificacion: "Verificación de eficacia",
  cerrada: "Cerrada",
  anulada: "Anulada",
}

export const STATUS_TONE: Record<NcStatus, Tone> = {
  abierta: "advertencia",
  analisis_causa: "advertencia",
  plan_accion: "info",
  en_ejecucion: "info",
  verificacion: "advertencia",
  cerrada: "exito",
  anulada: "neutro",
}

export const ACTION_TYPE_LABELS: Record<NcActionType, string> = {
  correccion: "Corrección",
  correctiva: "Correctiva",
  preventiva: "Preventiva",
}

export const ACTION_STATUS_LABELS: Record<NcActionStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
  cancelada: "Cancelada",
}

export const ACTION_STATUS_TONE: Record<NcActionStatus, Tone> = {
  pendiente: "neutro",
  en_curso: "info",
  hecha: "exito",
  cancelada: "neutro",
}

/** Pasos del ciclo para el stepper de la ficha (en orden). */
export const FLOW_STEPS: { key: NcStatus; label: string }[] = [
  { key: "abierta", label: "Abierta" },
  { key: "analisis_causa", label: "Causa" },
  { key: "plan_accion", label: "Plan" },
  { key: "en_ejecucion", label: "Ejecución" },
  { key: "verificacion", label: "Verificación" },
  { key: "cerrada", label: "Cerrada" },
]
