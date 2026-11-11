import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { ContextView } from "@/components/contexto/context-view"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getContextSummary, getCurrentUser, listContextIssues, listInterestedParties,
  listLegalRequirements, listObjectives, listPositions, listProcesses,
} from "@/lib/data/queries"
import { canManageContext, canSeeContext } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Contexto de la organización" }

export default async function ContextoPage() {
  const user = await getCurrentUser()
  if (!canSeeContext(user)) {
    return (
      <Page>
        <PageHeader title="Contexto de la organización" />
        <EmptyState icon={LockIcon} title="No tienes acceso al contexto" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageContext(user)
  const [summary, issues, parties, processes, objectives, positions, legal] = await Promise.all([
    getContextSummary(),
    listContextIssues(),
    listInterestedParties(),
    canManage ? listProcesses() : Promise.resolve([]),
    canManage ? listObjectives() : Promise.resolve([]),
    canManage ? listPositions() : Promise.resolve([]),
    canManage ? listLegalRequirements() : Promise.resolve([]),
  ])

  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const objectiveOptions = objectives
    .filter((o) => o.status === "activo")
    .map((o) => ({ id: o.id, name: `${o.code} · ${o.description.slice(0, 50)}` }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))
  const legalOptions = legal
    .filter((l) => l.status === "vigente")
    .map((l) => ({ id: l.id, name: `${l.code} · ${l.title}` }))

  return (
    <Page wide>
      <PageHeader title="Contexto de la organización" />
      <ContextView
        summary={summary}
        issues={issues}
        parties={parties}
        processes={processOptions}
        objectives={objectiveOptions}
        positions={positionOptions}
        legal={legalOptions}
        canManage={canManage}
      />
    </Page>
  )
}
