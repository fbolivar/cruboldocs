import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NcBoard } from "@/components/no-conformidades/nc-board"
import { NcSummary } from "@/components/no-conformidades/nc-summary"
import { ReportNcSheet } from "@/components/no-conformidades/report-nc-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getNcSummary, listNonconformities, listProcesses } from "@/lib/data/queries"
import { canSeeNonconformities } from "@/lib/domain/access"

export const metadata: Metadata = { title: "No conformidades" }

export default async function NonconformitiesPage() {
  const user = await getCurrentUser()
  if (!canSeeNonconformities(user)) {
    return (
      <Page>
        <PageHeader title="No conformidades" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a No conformidades"
          description="Si gestionas calidad en tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, processes] = await Promise.all([getNcSummary(), listNonconformities(), listProcesses()])
  const processOptions = processes.map((p) => ({ id: p.id, code: p.code }))

  return (
    <Page wide>
      <PageHeader title="No conformidades" actions={<ReportNcSheet processes={processOptions} />} />
      <div className="flex flex-col gap-4 md:gap-6">
        <NcSummary summary={summary} />
        <NcBoard items={items} />
      </div>
    </Page>
  )
}
