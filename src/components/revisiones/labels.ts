import type { ReviewOutputKind, ReviewSnapshot, ReviewStatus } from "@/lib/types"

// Etiquetas y tonos del módulo Revisión por la dirección (ver design/spec-revisiones.md).
type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"
type MetricTone = "texto" | "exito" | "advertencia" | "error"

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  borrador: "Borrador",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
}

export const REVIEW_STATUS_TONE: Record<ReviewStatus, Tone> = {
  borrador: "info",
  cerrada: "exito",
  cancelada: "neutro",
}

export const OUTPUT_KIND_LABELS: Record<ReviewOutputKind, string> = {
  decision: "Decisión",
  accion_mejora: "Acción de mejora",
  recurso: "Recurso",
  cambio_sgc: "Cambio del SGC",
}

export interface SnapshotBlock {
  title: string
  items: { value: string; label: string; tone?: MetricTone }[]
}

/** Arma los bloques de SnapshotCard desde el snapshot, con los tonos semánticos. */
export function snapshotBlocks(s: ReviewSnapshot): SnapshotBlock[] {
  return [
    {
      title: "No conformidades",
      items: [
        { value: String(s.nc.abiertas), label: "abiertas", tone: s.nc.abiertas > 0 ? "advertencia" : "texto" },
        { value: String(s.nc.cerradas), label: "cerradas" },
        { value: String(s.nc.eficaces), label: "eficaces", tone: "exito" },
      ],
    },
    {
      title: "Auditorías",
      items: [
        { value: String(s.auditorias.realizadas), label: "realizadas" },
        { value: String(s.auditorias.hallazgosNc), label: "hallazgos NC", tone: s.auditorias.hallazgosNc > 0 ? "advertencia" : "texto" },
      ],
    },
    {
      title: "Indicadores",
      items: [
        { value: s.indicadores.cumplenPct === null ? "—" : `${s.indicadores.cumplenPct}%`, label: "cumplen", tone: "exito" },
        { value: String(s.indicadores.enRiesgo), label: "en riesgo", tone: s.indicadores.enRiesgo > 0 ? "advertencia" : "texto" },
        { value: String(s.indicadores.noCumplen), label: "no cumplen", tone: s.indicadores.noCumplen > 0 ? "error" : "texto" },
      ],
    },
    {
      title: "Riesgos",
      items: [
        { value: String(s.riesgos.altos), label: "altos", tone: s.riesgos.altos > 0 ? "error" : "texto" },
        { value: s.riesgos.controlesATiempoPct === null ? "—" : `${s.riesgos.controlesATiempoPct}%`, label: "controles a tiempo" },
      ],
    },
    {
      title: "Documentos",
      items: [
        { value: String(s.documentos.vigentes), label: "vigentes" },
        { value: String(s.documentos.porVencer), label: "por vencer", tone: s.documentos.porVencer > 0 ? "advertencia" : "texto" },
      ],
    },
    {
      title: "Acciones de la revisión previa",
      items: [
        { value: String(s.accionesPrevias.total), label: "compromisos" },
        { value: String(s.accionesPrevias.pendientes), label: "pendientes", tone: s.accionesPrevias.pendientes > 0 ? "advertencia" : "texto" },
      ],
    },
  ]
}
