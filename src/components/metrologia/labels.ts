import type { CalibrationKind, CalibrationResult, EffectiveEquipmentStatus, MetrologyFrequency } from "@/lib/types"

export const EQUIPMENT_STATUS_LABELS: Record<EffectiveEquipmentStatus, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  fuera_de_servicio: "Fuera de servicio",
}

export const EQUIPMENT_STATUS_TONE: Record<EffectiveEquipmentStatus, "exito" | "error" | "neutro"> = {
  vigente: "exito",
  vencido: "error",
  fuera_de_servicio: "neutro",
}

export const CALIBRATION_RESULT_LABELS: Record<CalibrationResult, string> = {
  conforme: "Conforme",
  no_conforme: "No conforme",
  ajustado: "Ajustado",
}

export const CALIBRATION_RESULT_TONE: Record<CalibrationResult, "exito" | "error" | "advertencia"> = {
  conforme: "exito",
  no_conforme: "error",
  ajustado: "advertencia",
}

export const CALIBRATION_KIND_LABELS: Record<CalibrationKind, string> = {
  calibracion: "Calibración",
  verificacion: "Verificación",
}

export const FREQUENCY_LABELS: Record<MetrologyFrequency, string> = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  bienal: "Bienal",
}
