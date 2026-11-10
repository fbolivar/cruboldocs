import "server-only"

import type { NcDetail, NcListItem, NcSummary } from "@/lib/types"

// ⚠️ DATOS DE EJEMPLO — fase frontend. La fase de backend reemplaza estas funciones por consultas
// reales en `queries.ts` (migración 017 + RPCs) con la MISMA forma, sin tocar los componentes.

const ITEMS: NcListItem[] = [
  {
    id: "nc-007",
    code: "NC-2026-007",
    title: "Reproceso en la entrega de soporte por falta de reintento definido",
    processName: "SVC",
    source: "auditoria_interna",
    severity: "mayor",
    status: "en_ejecucion",
    reopened: false,
    overdueActions: 1,
    detectedAt: "2026-11-08",
  },
  {
    id: "nc-006",
    code: "NC-2026-006",
    title: "Queja por tiempo de respuesta comercial superior al ofrecido",
    processName: "COM",
    source: "queja_pqrs",
    severity: "menor",
    status: "verificacion",
    reopened: true,
    overdueActions: 0,
    detectedAt: "2026-11-05",
  },
  {
    id: "nc-005",
    code: "NC-2026-005",
    title: "Observación: formato de acta sin versión vigente",
    processName: "SGC",
    source: "auditoria_interna",
    severity: "observacion",
    status: "plan_accion",
    reopened: false,
    overdueActions: 0,
    detectedAt: "2026-11-03",
  },
  {
    id: "nc-004",
    code: "NC-2026-004",
    title: "Entrega de software con defecto detectado en producción",
    processName: "DS",
    source: "producto_servicio",
    severity: "mayor",
    status: "abierta",
    reopened: false,
    overdueActions: 0,
    detectedAt: "2026-11-02",
  },
]

const SUMMARY: NcSummary = {
  open: 12,
  inVerification: 3,
  overdueActions: 5,
  bySeverity: { observacion: 5, menor: 7, mayor: 2 },
}

const DETAIL: Record<string, NcDetail> = {
  "NC-2026-007": {
    id: "nc-007",
    code: "NC-2026-007",
    title: "Reproceso en la entrega de soporte por falta de reintento definido",
    description:
      "Al cerrar un caso de soporte, el sistema no reintenta el envío de la notificación y el cliente no recibe el cierre, lo que obliga a reprocesar el caso manualmente.",
    processName: "SVC",
    source: "auditoria_interna",
    severity: "mayor",
    status: "en_ejecucion",
    reopenedCount: 0,
    ownerPositionName: "Líder de Servicios TI",
    reportedByName: "Ana Pérez",
    detectedAt: "2026-11-08",
    rootCause:
      "El procedimiento PR-SVC-003 no define el reintento de notificación ni la verificación de entrega al cerrar un caso.",
    sourceRiskCode: null,
    actions: [
      {
        id: "a1",
        type: "correccion",
        description: "Reprocesar manualmente los casos afectados de la última semana.",
        responsiblePositionName: "Analista de Soporte",
        dueDate: "2026-11-11",
        status: "hecha",
        completedAt: "2026-11-09",
        overdue: false,
        evidences: [
          { id: "e1", fileName: "casos-reprocesados.pdf", registeredByName: "Carlos Ruiz", registeredAt: "2026-11-09", note: "12 casos reprocesados." },
        ],
      },
      {
        id: "a2",
        type: "correctiva",
        description: "Actualizar el procedimiento PR-SVC-003 con el reintento y la verificación de entrega.",
        responsiblePositionName: "Líder de Servicios TI",
        dueDate: "2026-11-20",
        status: "en_curso",
        completedAt: null,
        overdue: false,
        evidences: [],
      },
      {
        id: "a3",
        type: "preventiva",
        description: "Capacitar al equipo de soporte en el procedimiento actualizado.",
        responsiblePositionName: "Coordinador de Talento Humano",
        dueDate: "2026-11-15",
        status: "pendiente",
        completedAt: null,
        overdue: true,
        evidences: [],
      },
    ],
    verification: null,
    timeline: [
      { at: "2026-11-09", actor: "Carlos Ruiz", text: "Completó la acción «Reprocesar manualmente los casos afectados»." },
      { at: "2026-11-08", actor: "Líder SIG", text: "Agregó 3 acciones al plan." },
      { at: "2026-11-08", actor: "Líder SIG", text: "Registró el análisis de causa." },
      { at: "2026-11-08", actor: "Ana Pérez", text: "Reportó la no conformidad." },
    ],
    canManage: true,
  },
}

export async function listNonconformitiesMock(): Promise<{ items: NcListItem[]; total: number }> {
  return { items: ITEMS, total: ITEMS.length }
}

export async function getNcSummaryMock(): Promise<NcSummary> {
  return SUMMARY
}

export async function getNonconformityMock(code: string): Promise<NcDetail | null> {
  return DETAIL[code] ?? null
}
