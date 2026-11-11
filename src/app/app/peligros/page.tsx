import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { HazardsBoard } from "@/components/peligros/hazards-board"
import { ExportHazardsButton, NewHazardSheet } from "@/components/peligros/hazard-manage"
import { HazardsSummaryBar } from "@/components/peligros/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getHazardsSummary, listHazards, listPositions, listProcesses } from "@/lib/data/queries"
import { canManageHazards, canSeeHazards } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Peligros SST" }

export default async function PeligrosPage() {
  const user = await getCurrentUser()
  if (!canSeeHazards(user)) {
    return (
      <Page>
        <PageHeader title="Peligros SST" />
        <EmptyState icon={LockIcon} title="No tienes acceso a la matriz de peligros" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageHazards(user)
  const [summary, items, processes, positions] = await Promise.all([
    getHazardsSummary(), listHazards(), canManage ? listProcesses() : Promise.resolve([]), canManage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Peligros SST (GTC-45)"
        actions={
          <div className="flex gap-2">
            <ExportHazardsButton />
            {canManage && <NewHazardSheet processes={processOptions} positions={positionOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <HazardsSummaryBar summary={summary} />
        <HazardsBoard items={items} />
      </div>
    </Page>
  )
}
