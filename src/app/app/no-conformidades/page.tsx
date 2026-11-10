import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NcBoard } from "@/components/no-conformidades/nc-board"
import { NcSummary } from "@/components/no-conformidades/nc-summary"
import { ReportNcSheet } from "@/components/no-conformidades/report-nc-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser } from "@/lib/data/queries"
import { getNcSummaryMock, listNonconformitiesMock } from "@/lib/data/nc-mock"
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

  // ⚠️ Datos de ejemplo (fase frontend). La fase de backend conecta las consultas reales.
  const [summary, { items }] = await Promise.all([getNcSummaryMock(), listNonconformitiesMock()])
  const procesos = [...new Set(items.map((i) => i.processName).filter((p): p is string => !!p))].sort()

  return (
    <Page wide>
      <PageHeader title="No conformidades" actions={<ReportNcSheet processes={procesos} />} />
      <div className="flex flex-col gap-4 md:gap-6">
        <NcSummary summary={summary} />
        <NcBoard items={items} />
      </div>
    </Page>
  )
}
