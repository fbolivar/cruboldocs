import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { FormsBoard, FormsSummaryBar } from "@/components/formularios/forms-board"
import { NewTemplateSheet } from "@/components/formularios/forms-manage"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getFormsSummary, listFormTemplates, listProcesses } from "@/lib/data/queries"
import { canManageForms, canSeeForms } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Formularios" }

export default async function FormulariosPage() {
  const user = await getCurrentUser()
  if (!canSeeForms(user)) {
    return (
      <Page>
        <PageHeader title="Formularios" />
        <EmptyState icon={LockIcon} title="No tienes acceso a los formularios" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageForms(user)
  const [summary, items, processes] = await Promise.all([
    getFormsSummary(),
    listFormTemplates(),
    canManage ? listProcesses() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Formularios"
        actions={canManage ? <NewTemplateSheet processes={processOptions} /> : undefined}
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <FormsSummaryBar summary={summary} />
        <FormsBoard items={items} />
      </div>
    </Page>
  )
}
