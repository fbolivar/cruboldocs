import { TabError } from "@/components/admin/tab-layout"
import { FlowManager } from "@/components/solicitudes/flow-manager"
import { listApprovalFlows, listPositions } from "@/lib/data/queries"
import type { ApprovalFlowView, Position } from "@/lib/types"

/** Pestaña "Flujos" de Administración: plantillas de aprobación configurables (BPM-lite). */
export async function FlowsTab() {
  let flows: ApprovalFlowView[]
  let positions: Position[]
  try {
    ;[flows, positions] = await Promise.all([listApprovalFlows(), listPositions()])
  } catch {
    return <TabError />
  }
  return <FlowManager flows={flows} positions={positions.map((p) => ({ id: p.id, name: p.name }))} />
}
