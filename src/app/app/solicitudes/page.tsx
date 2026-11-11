import type { Metadata } from "next"

import { SolicitudesBoard, SolicitudesSummaryBar } from "@/components/solicitudes/board"
import { ExportSolicitudesButton, NewSolicitudSheet } from "@/components/solicitudes/new-solicitud-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { getApprovalSummary, getCurrentUser, listActiveFlowOptions, listApprovalRequests } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Solicitudes" }

export default async function SolicitudesPage() {
  const user = await getCurrentUser()
  const [summary, items, flows] = await Promise.all([
    getApprovalSummary(user), listApprovalRequests(user), listActiveFlowOptions(),
  ])

  return (
    <Page wide>
      <PageHeader
        title="Solicitudes y aprobaciones"
        actions={
          <div className="flex gap-2">
            <ExportSolicitudesButton />
            <NewSolicitudSheet flows={flows} />
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <SolicitudesSummaryBar summary={summary} />
        <SolicitudesBoard items={items} />
      </div>
    </Page>
  )
}
