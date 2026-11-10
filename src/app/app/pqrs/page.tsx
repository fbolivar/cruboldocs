import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewPqrsSheet, ExportPqrsButton } from "@/components/pqrs/new-pqrs-sheet"
import { PqrsBoard } from "@/components/pqrs/pqrs-board"
import { SatisfactionPanel } from "@/components/pqrs/satisfaction-panel"
import { PqrsSummaryBar } from "@/components/pqrs/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getPqrsSummary, listPqrs, listSatisfaction } from "@/lib/data/pqrs-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canManagePqrs, canSeePqrs } from "@/lib/domain/access"

export const metadata: Metadata = { title: "PQRS" }

export default async function PqrsPage() {
  const user = await getCurrentUser()
  if (!canSeePqrs(user)) {
    return (
      <Page>
        <PageHeader title="PQRS" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a PQRS"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, satisfaction] = await Promise.all([getPqrsSummary(), listPqrs(), listSatisfaction()])
  const canManage = canManagePqrs(user)

  return (
    <Page wide>
      <PageHeader
        title="PQRS y satisfacción"
        actions={
          <div className="flex gap-2">
            <ExportPqrsButton />
            {canManage && <NewPqrsSheet processes={[]} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <PqrsSummaryBar summary={summary} />
        <PqrsBoard items={items} />
        <SatisfactionPanel items={satisfaction} canManage={canManage} />
      </div>
    </Page>
  )
}
