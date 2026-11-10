import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { MinutesBoard } from "@/components/actas/minutes-board"
import { ExportMinutesButton, NewMinuteSheet } from "@/components/actas/new-minute-sheet"
import { MinutesSummaryBar } from "@/components/actas/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getMinutesSummary, listMinutes, listProcesses } from "@/lib/data/queries"
import { canManageMinutes, canSeeMinutes } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Actas" }

export default async function ActasPage() {
  const user = await getCurrentUser()
  if (!canSeeMinutes(user)) {
    return (
      <Page>
        <PageHeader title="Actas" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a las actas"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, processes] = await Promise.all([getMinutesSummary(), listMinutes(), listProcesses()])
  const canManage = canManageMinutes(user)
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Actas de reunión"
        actions={
          <div className="flex gap-2">
            <ExportMinutesButton />
            {canManage && <NewMinuteSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <MinutesSummaryBar summary={summary} />
        <MinutesBoard items={items} />
      </div>
    </Page>
  )
}
