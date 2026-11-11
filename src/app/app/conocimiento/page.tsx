import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { KnowledgeBoard, KnowledgeSummaryBar } from "@/components/conocimiento/board"
import { ExportKnowledgeCsvButton, NewArticleSheet } from "@/components/conocimiento/manage"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getKnowledgeSummary, listKnowledge, listProcesses } from "@/lib/data/queries"
import { canManageKnowledge, canSeeKnowledge } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Conocimiento" }

export default async function ConocimientoPage() {
  const user = await getCurrentUser()
  if (!canSeeKnowledge(user)) {
    return (
      <Page>
        <PageHeader title="Conocimiento" />
        <EmptyState icon={LockIcon} title="No tienes acceso" description="Inicia sesión en tu organización." />
      </Page>
    )
  }

  const canManage = canManageKnowledge(user)
  const [summary, items, processes] = await Promise.all([
    getKnowledgeSummary(),
    listKnowledge(),
    canManage ? listProcesses() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Conocimiento"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportKnowledgeCsvButton />
            {canManage && <NewArticleSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <KnowledgeSummaryBar summary={summary} />
        <KnowledgeBoard items={items} />
      </div>
    </Page>
  )
}
