import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { MetrologyBoard, MetrologySummaryBar, NewEquipmentSheet } from "@/components/metrologia/board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getMetrologySummary, listEquipment, listPositions, listProcesses } from "@/lib/data/queries"
import { canManageMetrology, canSeeMetrology } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Metrología" }

export default async function MetrologiaPage() {
  const user = await getCurrentUser()
  if (!canSeeMetrology(user)) {
    return (
      <Page>
        <PageHeader title="Metrología" />
        <EmptyState icon={LockIcon} title="No tienes acceso a metrología" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }
  const canManage = canManageMetrology(user)
  const [summary, items, processes, positions] = await Promise.all([
    getMetrologySummary(), listEquipment(),
    canManage ? listProcesses() : Promise.resolve([]),
    canManage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader title="Metrología" actions={canManage ? <NewEquipmentSheet processes={processOptions} positions={positionOptions} /> : undefined} />
      <div className="flex flex-col gap-4 md:gap-6">
        <MetrologySummaryBar summary={summary} />
        <MetrologyBoard items={items} />
      </div>
    </Page>
  )
}
