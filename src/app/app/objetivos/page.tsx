import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { ObjectivesBoard } from "@/components/objetivos/objectives-board"
import { ExportObjectivesButton, NewObjectiveSheet } from "@/components/objetivos/objective-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, listObjectiveIndicators, listObjectives, listProcesses } from "@/lib/data/queries"
import { canManageObjectives, canSeeObjectives } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Objetivos de calidad" }

export default async function ObjetivosPage() {
  const user = await getCurrentUser()
  if (!canSeeObjectives(user)) {
    return (
      <Page>
        <PageHeader title="Objetivos de calidad" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a los objetivos"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [items, indicators, processes] = await Promise.all([listObjectives(), listObjectiveIndicators(), listProcesses()])
  const canManage = canManageObjectives(user)
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Objetivos de calidad (BSC)"
        actions={
          <div className="flex gap-2">
            <ExportObjectivesButton />
            {canManage && <NewObjectiveSheet indicators={indicators} processes={processOptions} />}
          </div>
        }
      />
      <ObjectivesBoard items={items} indicators={indicators} processes={processOptions} />
    </Page>
  )
}
