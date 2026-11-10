// DATOS DE EJEMPLO del Módulo 8 (Actas + Objetivos/BSC, fase frontend). Misma forma que tendrán
// las queries reales; la fase de backend reemplaza este archivo por queries.ts + actions.ts. NO usar en producción.

import type { MinuteDetail, MinuteListItem, MinutesSummary, ObjectiveCardView, ObjectiveIndicatorRef } from "@/lib/types"

const MINUTES: MinuteListItem[] = [
  { id: "a1", code: "ACT-2026-009", title: "Revisión mensual del SIG", meetingType: "comité", meetingDate: "2026-11-05", processName: "Calidad", status: "borrador", commitmentCount: 3, pendingCount: 2 },
  { id: "a2", code: "ACT-2026-008", title: "Cierre de acciones Q3", meetingType: "seguimiento", meetingDate: "2026-10-28", processName: "Comercial", status: "cerrada", commitmentCount: 4, pendingCount: 0 },
  { id: "a3", code: "ACT-2026-007", title: "Comité de calidad octubre", meetingType: "comité", meetingDate: "2026-10-10", processName: "Calidad", status: "cerrada", commitmentCount: 2, pendingCount: 1 },
  { id: "a4", code: "ACT-2026-006", title: "Planeación de auditorías", meetingType: "otro", meetingDate: "2026-09-22", processName: null, status: "borrador", commitmentCount: 0, pendingCount: 0 },
]

const DETAIL: Record<string, MinuteDetail> = {
  "ACT-2026-009": {
    id: "a1", code: "ACT-2026-009", title: "Revisión mensual del SIG", meetingType: "comité",
    meetingDate: "2026-11-05", processId: "p-cal", processName: "Calidad",
    attendees: "Ana Ruiz, Juan Pérez, invitado externo J. Gómez",
    agenda: "1. Seguimiento de acciones.\n2. Indicadores de octubre.\n3. Preparación de auditoría interna.",
    status: "borrador",
    commitments: [
      { id: "c1", description: "Actualizar el procedimiento PR-07", responsibleName: "Coordinador de Calidad", dueDate: "2026-11-20", status: "pendiente" },
      { id: "c2", description: "Capacitar al equipo comercial en el nuevo flujo", responsibleName: "Líder Comercial", dueDate: "2026-11-15", status: "cumplido" },
      { id: "c3", description: "Consolidar indicadores de octubre", responsibleName: null, dueDate: null, status: "pendiente" },
    ],
    timeline: [{ at: "2026-11-05T15:00:00Z", actor: "Ana Ruiz", text: "Creó el acta (comité)." }],
    canManage: true,
  },
  "ACT-2026-008": {
    id: "a2", code: "ACT-2026-008", title: "Cierre de acciones Q3", meetingType: "seguimiento",
    meetingDate: "2026-10-28", processId: "p-com", processName: "Comercial",
    attendees: "Ana Ruiz, Pedro Gómez",
    agenda: "Revisión del cumplimiento de los compromisos del trimestre.",
    status: "cerrada",
    commitments: [
      { id: "c4", description: "Enviar propuesta revisada al cliente X", responsibleName: "Analista Comercial", dueDate: "2026-11-02", status: "cumplido" },
      { id: "c5", description: "Documentar la lección aprendida", responsibleName: "Líder Comercial", dueDate: "2026-11-01", status: "cumplido" },
    ],
    timeline: [
      { at: "2026-11-01T10:00:00Z", actor: "Ana Ruiz", text: "Cerró el acta." },
      { at: "2026-10-28T09:00:00Z", actor: "Ana Ruiz", text: "Creó el acta (seguimiento)." },
    ],
    canManage: true,
  },
}

const OBJECTIVES: ObjectiveCardView[] = [
  { id: "o1", code: "OBJ-2026-001", description: "Reducir el costo de la no calidad", perspective: "financiera", processName: "Calidad", processId: "p-cal", targetText: "−15% anual", horizonYear: 2026, status: "activo", indicatorCount: 2, progressPct: 78, indicatorIds: ["i1", "i2"], canManage: true },
  { id: "o2", code: "OBJ-2026-002", description: "Disminuir reprocesos en producción", perspective: "financiera", processName: "Producción", processId: "p-prod", targetText: "≤3%", horizonYear: 2026, status: "cumplido", indicatorCount: 1, progressPct: 92, indicatorIds: ["i3"], canManage: true },
  { id: "o3", code: "OBJ-2026-003", description: "Elevar la satisfacción del cliente", perspective: "cliente", processName: "Servicio", processId: "p-serv", targetText: "≥85/100", horizonYear: 2026, status: "activo", indicatorCount: 1, progressPct: 90, indicatorIds: ["i4"], canManage: true },
  { id: "o4", code: "OBJ-2026-004", description: "Estandarizar el proceso de despacho", perspective: "procesos", processName: "Logística", processId: "p-log", targetText: "Procedimiento publicado", horizonYear: 2026, status: "activo", indicatorCount: 0, progressPct: null, indicatorIds: [], canManage: true },
  { id: "o5", code: "OBJ-2026-005", description: "Cerrar brechas de competencia del equipo", perspective: "aprendizaje", processName: "Talento Humano", processId: "p-th", targetText: "100% del plan", horizonYear: 2026, status: "activo", indicatorCount: 2, progressPct: 55, indicatorIds: ["i5", "i6"], canManage: true },
]

const INDICATORS: ObjectiveIndicatorRef[] = [
  { id: "i1", name: "Costo de reprocesos" },
  { id: "i2", name: "Devoluciones por calidad" },
  { id: "i3", name: "% de reprocesos" },
  { id: "i4", name: "Índice de satisfacción (CSAT)" },
  { id: "i5", name: "Horas de formación por persona" },
  { id: "i6", name: "% de brechas cerradas" },
]

export async function getMinutesSummary(): Promise<MinutesSummary> {
  return { totalYear: MINUTES.length, drafts: MINUTES.filter((m) => m.status === "borrador").length, pendingCommitments: MINUTES.reduce((n, m) => n + m.pendingCount, 0) }
}

export async function listMinutes(): Promise<MinuteListItem[]> {
  return MINUTES
}

export async function getMinute(code: string): Promise<MinuteDetail | null> {
  return DETAIL[code] ?? null
}

export async function listObjectives(): Promise<ObjectiveCardView[]> {
  return OBJECTIVES
}

export async function listObjectiveIndicators(): Promise<ObjectiveIndicatorRef[]> {
  return INDICATORS
}
