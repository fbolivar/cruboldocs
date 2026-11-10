// Datos de ejemplo del Módulo Revisión por la dirección (fase frontend). Misma forma que
// devolverá el backend (migración 023 + RPCs). Se reemplaza por queries.ts en la fase de backend.
import type { ReviewDetail, ReviewListItem, ReviewOutputView, ReviewSnapshot } from "@/lib/types"

const SNAPSHOT_2: ReviewSnapshot = {
  nc: { abiertas: 3, cerradas: 5, eficaces: 4 },
  auditorias: { realizadas: 2, hallazgosNc: 1 },
  indicadores: { cumplenPct: 78, enRiesgo: 2, noCumplen: 1 },
  riesgos: { altos: 2, controlesATiempoPct: 90 },
  documentos: { vigentes: 40, porVencer: 3 },
  accionesPrevias: { total: 3, pendientes: 1 },
}

const OUTPUTS_2: ReviewOutputView[] = [
  {
    id: "o1", kind: "accion_mejora", description: "Implementar monitoreo de disponibilidad del servicio TI.",
    responsibleName: "Coordinador de TI", dueDate: "2027-01-31", nonconformityCode: null,
  },
  {
    id: "o2", kind: "recurso", description: "Aprobar el presupuesto de capacitación 2027.",
    responsibleName: "Gerente General", dueDate: null, nonconformityCode: null,
  },
  {
    id: "o3", kind: "decision", description: "Mantener la certificación ISO 9001 y programar la auditoría externa.",
    responsibleName: "Líder SIG", dueDate: null, nonconformityCode: null,
  },
  {
    id: "o4", kind: "accion_mejora", description: "Reducir reprocesos en producción por debajo del 3%.",
    responsibleName: "Coordinador de Calidad", dueDate: "2027-03-31", nonconformityCode: "NC-2026-012",
  },
]

const LIST: ReviewListItem[] = [
  { id: "r2", code: "RD-2026-002", title: "Revisión por la dirección 2026-2", periodStart: "2026-01-01", periodEnd: "2026-12-31", meetingDate: "2026-12-15", status: "borrador", outputCount: OUTPUTS_2.length },
  { id: "r1", code: "RD-2026-001", title: "Revisión por la dirección 2026-1", periodStart: "2026-01-01", periodEnd: "2026-06-30", meetingDate: "2026-07-10", status: "cerrada", outputCount: 6 },
]

export function listReviewsMock(): ReviewListItem[] {
  return LIST
}

export function getReviewMock(code: string): ReviewDetail | null {
  if (code === "RD-2026-002") {
    return {
      id: "r2", code: "RD-2026-002", title: "Revisión por la dirección 2026-2",
      periodStart: "2026-01-01", periodEnd: "2026-12-31", meetingDate: "2026-12-15",
      attendees: "Gerente General, Líder SIG, Coordinadores de proceso",
      scope: "Desempeño del SGC del segundo semestre y planificación 2027.",
      status: "borrador", snapshot: SNAPSHOT_2,
      inputs: {
        satisfaccion: "Encuesta Q4: 3.9/5 (baja respecto al objetivo de 4.5).",
        retroalimentacion: "Dos quejas por demoras de soporte, ambas atendidas.",
        proveedores: "Proveedor logístico con incumplimientos en noviembre.",
        recursos: "Se requiere reforzar el equipo de TI.",
        mejora: "Automatizar el monitoreo de disponibilidad.",
      },
      outputs: OUTPUTS_2,
      approvedByName: null, approvedAt: null, cancelReason: null,
      timeline: [
        { at: "2026-12-10T09:00:00Z", actor: "Líder SIG", text: "Creó el acta." },
        { at: "2026-12-12T15:00:00Z", actor: "Líder SIG", text: "Actualizó los datos del sistema." },
      ],
      canManage: true,
    }
  }
  if (code === "RD-2026-001") {
    return {
      id: "r1", code: "RD-2026-001", title: "Revisión por la dirección 2026-1",
      periodStart: "2026-01-01", periodEnd: "2026-06-30", meetingDate: "2026-07-10",
      attendees: "Gerente General, Líder SIG",
      scope: "Desempeño del SGC del primer semestre.",
      status: "cerrada",
      snapshot: { nc: { abiertas: 1, cerradas: 2, eficaces: 2 }, auditorias: { realizadas: 1, hallazgosNc: 0 }, indicadores: { cumplenPct: 85, enRiesgo: 1, noCumplen: 0 }, riesgos: { altos: 1, controlesATiempoPct: 95 }, documentos: { vigentes: 38, porVencer: 1 }, accionesPrevias: { total: 0, pendientes: 0 } },
      inputs: {
        satisfaccion: "Encuesta Q2: 4.6/5.", retroalimentacion: "Sin quejas relevantes.",
        proveedores: "Desempeño conforme.", recursos: "Adecuados.", mejora: "Fortalecer indicadores.",
      },
      outputs: [
        { id: "p1", kind: "decision", description: "Aprobar la política de calidad actualizada.", responsibleName: "Gerente General", dueDate: null, nonconformityCode: null },
      ],
      approvedByName: "Gerente General", approvedAt: "2026-07-10T19:20:00Z", cancelReason: null,
      timeline: [
        { at: "2026-07-05T09:00:00Z", actor: "Líder SIG", text: "Creó el acta." },
        { at: "2026-07-10T19:20:00Z", actor: "Gerente General", text: "Cerró y firmó el acta." },
      ],
      canManage: true,
    }
  }
  return null
}
