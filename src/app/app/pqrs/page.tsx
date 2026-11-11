import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewPqrsSheet, ExportPqrsButton } from "@/components/pqrs/new-pqrs-sheet"
import { PqrsBoard } from "@/components/pqrs/pqrs-board"
import { SatisfactionPanel } from "@/components/pqrs/satisfaction-panel"
import { PqrsSummaryBar } from "@/components/pqrs/summary"
import { PublicPqrsSheet } from "@/components/portal/public-pqrs-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getPqrsPortal, getPqrsSummary, listPqrs, listProcesses, listSatisfaction, listSurveys } from "@/lib/data/queries"
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

  const canManage = canManagePqrs(user)
  const [summary, items, satisfaction, surveys, processes, portal] = await Promise.all([
    getPqrsSummary(), listPqrs(), listSatisfaction(), listSurveys(), listProcesses(),
    canManage ? getPqrsPortal() : Promise.resolve(null),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="PQRS y satisfacción"
        actions={
          <div className="flex gap-2">
            <ExportPqrsButton />
            {canManage && portal && <PublicPqrsSheet portal={portal} baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />}
            {canManage && <NewPqrsSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <PqrsSummaryBar summary={summary} />
        <PqrsBoard items={items} />
        <SatisfactionPanel items={satisfaction} campaigns={surveys} canManage={canManage} processes={processOptions} />
      </div>
    </Page>
  )
}
