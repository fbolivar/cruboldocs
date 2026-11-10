// DATOS DE EJEMPLO del módulo Proveedores (fase frontend). Misma forma que tendrán las queries reales;
// la fase de backend reemplaza este archivo por queries.ts + actions.ts. NO usar en producción.

import type { SupplierDetail, SupplierListItem, SupplierSummary } from "@/lib/types"

const LIST: SupplierListItem[] = [
  { id: "s1", code: "PRV-2026-001", name: "Transportes del Valle S.A.S.", kind: "servicio", criticality: "alta", status: "aprobado", processName: "Logística", nextEvalDate: "2027-03-01" },
  { id: "s2", code: "PRV-2026-002", name: "Insumos Andinos Ltda.", kind: "bien", criticality: "media", status: "condicionado", processName: "Compras", nextEvalDate: "2026-11-20" },
  { id: "s3", code: "PRV-2026-003", name: "Servicios TI Global", kind: "ambos", criticality: "alta", status: "pendiente", processName: "TI", nextEvalDate: null },
  { id: "s4", code: "PRV-2026-004", name: "Aseo Total", kind: "servicio", criticality: "baja", status: "inactivo", processName: null, nextEvalDate: null },
]

const DETAIL: Record<string, SupplierDetail> = {
  "PRV-2026-001": {
    id: "s1", code: "PRV-2026-001", name: "Transportes del Valle S.A.S.", nit: "900.555.444-3",
    kind: "servicio", category: "Logística", criticality: "alta", processName: "Logística", processId: "p-log",
    contactName: "Ana Ruiz", contactEmail: "ana@valle.co", contactPhone: "3105550000",
    status: "aprobado", isActive: true, lastScore: 86.5, lastResult: "aprobado", nextEvalDate: "2027-03-01",
    evaluations: [
      { id: "e2", kind: "periodica", evalDate: "2026-03-01", scoreQuality: 90, scoreDelivery: 85, scoreService: 80, totalScore: 86.5, result: "aprobado", nextEvalDate: "2027-03-01", note: "Buen desempeño.", evaluatedBy: "Juan Pérez" },
      { id: "e1", kind: "inicial", evalDate: "2025-03-01", scoreQuality: 70, scoreDelivery: 60, scoreService: 65, totalScore: 66.5, result: "condicionado", nextEvalDate: "2026-03-01", note: "Selección inicial.", evaluatedBy: "Juan Pérez" },
    ],
    timeline: [
      { at: "2026-03-01T15:00:00Z", actor: "Juan Pérez", text: "Evaluó al proveedor: Aprobado (86.5)." },
      { at: "2025-03-01T10:00:00Z", actor: "Juan Pérez", text: "Registró al proveedor y lo evaluó: Condicionado (66.5)." },
    ],
    canManage: true,
  },
  "PRV-2026-003": {
    id: "s3", code: "PRV-2026-003", name: "Servicios TI Global", nit: null,
    kind: "ambos", category: "Tecnología", criticality: "alta", processName: "TI", processId: "p-ti",
    contactName: null, contactEmail: null, contactPhone: null,
    status: "pendiente", isActive: true, lastScore: null, lastResult: null, nextEvalDate: null,
    evaluations: [],
    timeline: [{ at: "2026-10-01T12:00:00Z", actor: "Juan Pérez", text: "Registró al proveedor." }],
    canManage: true,
  },
}

export async function getSupplierSummary(): Promise<SupplierSummary> {
  return { approved: 1, conditionedOrRejected: 1, dueForReeval: 1 }
}

export async function listSuppliers(): Promise<SupplierListItem[]> {
  return LIST
}

export async function getSupplier(code: string): Promise<SupplierDetail | null> {
  return DETAIL[code] ?? null
}
