import "server-only"

import type { AuditDetail, AuditListItem, AuditSummary } from "@/lib/types"

// ⚠️ DATOS DE EJEMPLO — fase frontend. La fase de backend reemplaza estas funciones por consultas
// reales en `queries.ts` (migración 020 + RPCs) con la MISMA forma, sin tocar los componentes.

const ITEMS: AuditListItem[] = [
  {
    id: "aud-003",
    code: "AUD-2026-003",
    title: "Auditoría interna SGC 2026-2",
    processNames: ["SVC", "DS"],
    leadAuditorName: "Auditor Interno",
    plannedDate: "2026-11-20",
    status: "en_ejecucion",
    findingCount: 4,
  },
  {
    id: "aud-002",
    code: "AUD-2026-002",
    title: "Auditoría de Infraestructura TI",
    processNames: ["TI"],
    leadAuditorName: "Auditor Interno",
    plannedDate: "2026-09-10",
    status: "cerrada",
    findingCount: 3,
  },
  {
    id: "aud-001",
    code: "AUD-2026-001",
    title: "Auditoría interna SGC 2026-1",
    processNames: ["DE", "SGC"],
    leadAuditorName: "Líder SIG",
    plannedDate: "2026-12-05",
    status: "planificada",
    findingCount: 0,
  },
]

const SUMMARY: AuditSummary = { planned: 2, inProgress: 1, closedThisYear: 5, ncFindings: 3 }

const DETAIL: Record<string, AuditDetail> = {
  "AUD-2026-003": {
    id: "aud-003",
    code: "AUD-2026-003",
    title: "Auditoría interna SGC 2026-2",
    objective: "Verificar la conformidad del SGC en Servicios y Soporte TI y Desarrollo de Software.",
    criteria: "ISO 9001:2015, PR-SVC-003, normograma vigente.",
    processNames: ["SVC", "DS"],
    leadAuditorName: "Auditor Interno",
    plannedDate: "2026-11-20",
    status: "en_ejecucion",
    conclusions: null,
    findings: [
      {
        id: "f1",
        type: "no_conformidad",
        severity: "mayor",
        processName: "SVC",
        description: "El procedimiento no controla la versión del formato de cierre de caso.",
        criteriaRef: "7.5.3",
        nonconformityCode: "NC-2026-009",
      },
      {
        id: "f2",
        type: "no_conformidad",
        severity: "menor",
        processName: "DS",
        description: "Registros de pruebas de una entrega sin responsable asignado.",
        criteriaRef: "8.5.1",
        nonconformityCode: null,
      },
      {
        id: "f3",
        type: "observacion",
        severity: null,
        processName: "DS",
        description: "La trazabilidad de incidencias podría enlazarse con el tablero de riesgos.",
        criteriaRef: null,
        nonconformityCode: null,
      },
      {
        id: "f4",
        type: "conformidad",
        severity: null,
        processName: "SVC",
        description: "El control de evidencias de soporte cumple el procedimiento.",
        criteriaRef: null,
        nonconformityCode: null,
      },
    ],
    timeline: [
      { at: "2026-11-21", actor: "Auditor Interno", text: "Agregó 4 hallazgos." },
      { at: "2026-11-20", actor: "Líder SIG", text: "Inició la auditoría." },
      { at: "2026-11-10", actor: "Líder SIG", text: "Planificó la auditoría." },
    ],
    canManage: true,
    canAddFinding: true,
  },
}

export async function listAuditsMock(): Promise<AuditListItem[]> {
  return ITEMS
}

export async function getAuditSummaryMock(): Promise<AuditSummary> {
  return SUMMARY
}

export async function getAuditMock(code: string): Promise<AuditDetail | null> {
  return DETAIL[code] ?? null
}
