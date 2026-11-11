import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { ChangesBoard, ChangesSummaryBar, NewChangeSheet } from "@/components/cambios/board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getChangesSummary, getCurrentUser, listChanges, listPositions, listProcesses } from "@/lib/data/queries"
import { canManageChanges, canSeeChanges } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Gestión del cambio" }

export default async function CambiosPage() {
  const user = await getCurrentUser()
  if (!canSeeChanges(user)) {
    return (
      <Page>
        <PageHeader title="Gestión del cambio" />
        <EmptyState icon={LockIcon} title="No tienes acceso a gestión del cambio" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }
  const canManage = canManageChanges(user)
  const [summary, items, processes, positions] = await Promise.all([
    getChangesSummary(), listChanges(),
    canManage ? listProcesses() : Promise.resolve([]),
    canManage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader title="Gestión del cambio" actions={canManage ? <NewChangeSheet processes={processOptions} positions={positionOptions} /> : undefined} />
      <div className="flex flex-col gap-4 md:gap-6">
        <ChangesSummaryBar summary={summary} />
        <ChangesBoard items={items} />
      </div>
    </Page>
  )
}
