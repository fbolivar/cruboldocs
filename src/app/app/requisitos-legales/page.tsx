import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { LegalBoard } from "@/components/requisitos-legales/legal-board"
import { ExportLegalButton, NewRequirementSheet } from "@/components/requisitos-legales/new-requirement-sheet"
import { LegalSummaryBar } from "@/components/requisitos-legales/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getLegalSummary, listLegalRequirements, listProcesses } from "@/lib/data/queries"
import { canManageLegal, canSeeLegal } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Requisitos legales" }

export default async function RequisitosLegalesPage() {
  const user = await getCurrentUser()
  if (!canSeeLegal(user)) {
    return (
      <Page>
        <PageHeader title="Requisitos legales" />
        <EmptyState icon={LockIcon} title="No tienes acceso a los requisitos legales" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const [summary, items, processes] = await Promise.all([getLegalSummary(), listLegalRequirements(), listProcesses()])
  const canManage = canManageLegal(user)
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Requisitos legales"
        actions={
          <div className="flex gap-2">
            <ExportLegalButton />
            {canManage && <NewRequirementSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <LegalSummaryBar summary={summary} />
        <LegalBoard items={items} />
      </div>
    </Page>
  )
}
