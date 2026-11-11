import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NcOutputsBoard, NcOutputsSummaryBar } from "@/components/salidas-no-conformes/board"
import { ExportNcOutputsCsvButton, NewNcOutputSheet } from "@/components/salidas-no-conformes/manage"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getNcOutputsSummary, listNcOutputs, listProcesses } from "@/lib/data/queries"
import { canManageNcOutputs, canSeeNcOutputs } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Salidas no conformes" }

export default async function SalidasNoConformesPage() {
  const user = await getCurrentUser()
  if (!canSeeNcOutputs(user)) {
    return (
      <Page>
        <PageHeader title="Salidas no conformes" />
        <EmptyState icon={LockIcon} title="No tienes acceso" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageNcOutputs(user)
  const [summary, items, processes] = await Promise.all([
    getNcOutputsSummary(),
    listNcOutputs(),
    canManage ? listProcesses() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Salidas no conformes"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportNcOutputsCsvButton />
            {canManage && <NewNcOutputSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <NcOutputsSummaryBar summary={summary} />
        <NcOutputsBoard items={items} />
      </div>
    </Page>
  )
}
