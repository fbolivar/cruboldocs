import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { IncidentsBoard } from "@/components/incidentes/board"
import { ReportIncidentSheet, ExportIncidentsButton } from "@/components/incidentes/report-incident-sheet"
import { IncidentSummaryBar } from "@/components/incidentes/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getCurrentUser,
  getIncidentSummary,
  listHazards,
  listIncidents,
  listPositions,
  listProcesses,
} from "@/lib/data/queries"
import { canSeeIncidents } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Incidentes SST" }

export default async function IncidentesPage() {
  const user = await getCurrentUser()
  if (!canSeeIncidents(user)) {
    return (
      <Page>
        <PageHeader title="Incidentes SST" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Incidentes SST"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, processes, hazards, positions] = await Promise.all([
    getIncidentSummary(),
    listIncidents(),
    listProcesses(),
    listHazards(),
    listPositions(),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const hazardOptions = hazards.map((h) => ({ id: h.id, name: `${h.code} · ${h.hazard}` }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Incidentes SST"
        actions={
          <div className="flex gap-2">
            <ExportIncidentsButton />
            <ReportIncidentSheet processes={processOptions} hazards={hazardOptions} positions={positionOptions} />
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <IncidentSummaryBar summary={summary} />
        <IncidentsBoard items={items} />
      </div>
    </Page>
  )
}
