import type { IncidentKind, IncidentSeverity, IncidentStatus } from "@/lib/types"

// Etiquetas y tonos del módulo Incidentes SST (design/spec-incidentes.md, ADR-118..120).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = {
  accidente: "Accidente",
  incidente: "Incidente",
  casi_accidente: "Casi-accidente",
}

export const INCIDENT_KIND_TONE: Record<IncidentKind, Tone> = {
  accidente: "error",
  incidente: "advertencia",
  casi_accidente: "info",
}

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  sin_lesion: "Sin lesión",
  leve: "Leve",
  grave: "Grave",
  mortal: "Mortal",
}

export const SEVERITY_TONE: Record<IncidentSeverity, Tone> = {
  sin_lesion: "neutro",
  leve: "info",
  grave: "advertencia",
  mortal: "error",
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reportado: "Reportado",
  en_investigacion: "En investigación",
  cerrado: "Cerrado",
  anulado: "Anulado",
}

export const INCIDENT_STATUS_TONE: Record<IncidentStatus, Tone> = {
  reportado: "info",
  en_investigacion: "advertencia",
  cerrado: "exito",
  anulado: "neutro",
}
