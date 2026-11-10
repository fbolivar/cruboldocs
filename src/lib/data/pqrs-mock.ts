// DATOS DE EJEMPLO del módulo PQRS (fase frontend). Misma forma que tendrán las queries reales;
// la fase de backend reemplaza este archivo por queries.ts + actions.ts. NO usar en producción.

import type { PqrsDetail, PqrsListItem, PqrsSummary, SatisfactionMeasurementView } from "@/lib/types"

const LIST: PqrsListItem[] = [
  { id: "q1", code: "PQRS-2026-012", type: "reclamo", customerName: "Juan Cliente", status: "en_gestion", processName: "Comercial", dueDate: "2026-11-18" },
  { id: "q2", code: "PQRS-2026-011", type: "peticion", customerName: "María López", status: "cerrada", processName: "Servicio", dueDate: "2026-11-02" },
  { id: "q3", code: "PQRS-2026-010", type: "queja", customerName: "Pedro Gómez", status: "recibida", processName: "Logística", dueDate: "2026-11-09" },
  { id: "q4", code: "PQRS-2026-009", type: "felicitacion", customerName: "Ana Díaz", status: "cerrada", processName: null, dueDate: "2026-10-20" },
]

const SATISFACTION: SatisfactionMeasurementView[] = [
  { id: "s1", period: "2026-11-01", method: "encuesta", score: 84, responses: 32, note: "Mejora en tiempos de entrega." },
  { id: "s2", period: "2026-10-01", method: "nps", score: 71, responses: 28, note: null },
]

const DETAIL: Record<string, PqrsDetail> = {
  "PQRS-2026-012": {
    id: "q1", code: "PQRS-2026-012", type: "reclamo", channel: "correo",
    customerName: "Juan Cliente", customerContact: "juan@correo.co",
    processName: "Comercial", processId: "p-com", description: "El pedido llegó incompleto y con retraso de una semana.",
    receivedDate: "2026-11-03", dueDate: "2026-11-18", status: "en_gestion",
    responsibleName: "Coordinador de Servicio", response: null, satisfied: null, nonconformityCode: null,
    timeline: [{ at: "2026-11-03T15:00:00Z", actor: "Ana Ruiz", text: "Registró la PQRS (reclamo)." }],
    canManage: true,
  },
  "PQRS-2026-011": {
    id: "q2", code: "PQRS-2026-011", type: "peticion", channel: "web",
    customerName: "María López", customerContact: "3105550000",
    processName: "Servicio", processId: "p-serv", description: "Solicita copia de la factura de octubre.",
    receivedDate: "2026-10-20", dueDate: "2026-11-02", status: "cerrada",
    responsibleName: "Analista de Servicio", response: "Se envió la factura por correo el 2026-10-22.",
    satisfied: true, nonconformityCode: null,
    timeline: [
      { at: "2026-10-22T10:00:00Z", actor: "Ana Ruiz", text: "Cerró la PQRS: cliente conforme." },
      { at: "2026-10-20T09:00:00Z", actor: "Ana Ruiz", text: "Registró la PQRS (petición)." },
    ],
    canManage: true,
  },
}

export async function getPqrsSummary(): Promise<PqrsSummary> {
  return { open: 2, overdue: 1, lastSatisfactionScore: 84, lastSatisfactionPeriod: "2026-11-01" }
}

export async function listPqrs(): Promise<PqrsListItem[]> {
  return LIST
}

export async function listSatisfaction(): Promise<SatisfactionMeasurementView[]> {
  return SATISFACTION
}

export async function getPqrs(code: string): Promise<PqrsDetail | null> {
  return DETAIL[code] ?? null
}
