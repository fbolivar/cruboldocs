import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { EnvBoard } from "@/components/ambiental/env-board"
import { ExportEnvButton, NewAspectSheet } from "@/components/ambiental/env-manage"
import { EnvSummaryBar } from "@/components/ambiental/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getEnvSummary, listEnvAspects, listLegalRequirements, listPositions, listProcesses } from "@/lib/data/queries"
import { canManageEnv, canSeeEnv } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Aspectos ambientales" }

export default async function AspectosAmbientalesPage() {
  const user = await getCurrentUser()
  if (!canSeeEnv(user)) {
    return (
      <Page>
        <PageHeader title="Aspectos ambientales" />
        <EmptyState icon={LockIcon} title="No tienes acceso a los aspectos ambientales" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageEnv(user)
  const [summary, items, processes, positions, legal] = await Promise.all([
    getEnvSummary(), listEnvAspects(),
    canManage ? listProcesses() : Promise.resolve([]),
    canManage ? listPositions() : Promise.resolve([]),
    canManage ? listLegalRequirements() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))
  const legalOptions = legal.filter((r) => r.status === "vigente").map((r) => ({ id: r.id, label: `${r.code} · ${r.title}` }))

  return (
    <Page wide>
      <PageHeader
        title="Aspectos ambientales (14001)"
        actions={
          <div className="flex gap-2">
            <ExportEnvButton />
            {canManage && <NewAspectSheet processes={processOptions} positions={positionOptions} legalOptions={legalOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <EnvSummaryBar summary={summary} />
        <EnvBoard items={items} />
      </div>
    </Page>
  )
}
