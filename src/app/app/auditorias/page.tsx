import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { AuditBoard } from "@/components/auditorias/audit-board"
import { AuditSummaryBar } from "@/components/auditorias/audit-summary"
import { PlanAuditSheet } from "@/components/auditorias/plan-audit-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getAuditSummary, getCurrentUser, listAudits, listPositions, listProcesses } from "@/lib/data/queries"
import { canManageAudits, canSeeAudits } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Auditorías internas" }

export default async function AuditsPage() {
  const user = await getCurrentUser()
  if (!canSeeAudits(user)) {
    return (
      <Page>
        <PageHeader title="Auditorías internas" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Auditorías"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, processes, positions] = await Promise.all([
    getAuditSummary(),
    listAudits(),
    listProcesses(),
    listPositions(),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, code: p.code }))
  const auditors = positions
    .filter((p) => p.roles.some((r) => r.role === "auditor"))
    .map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader title="Auditorías internas" actions={canManageAudits(user) ? <PlanAuditSheet processes={processOptions} auditors={auditors} /> : null} />
      <div className="flex flex-col gap-4 md:gap-6">
        <AuditSummaryBar summary={summary} />
        <AuditBoard items={items} />
      </div>
    </Page>
  )
}
