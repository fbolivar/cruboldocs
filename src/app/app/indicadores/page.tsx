import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { IndicatorBoard } from "@/components/indicadores/indicator-board"
import { IndicatorSummaryBar } from "@/components/indicadores/indicator-summary"
import { NewIndicatorSheet } from "@/components/indicadores/new-indicator-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getIndicatorSummaryMock, listIndicatorsMock, processOptionsMock } from "@/lib/data/indicators-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canManageIndicators, canSeeIndicators } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Indicadores de gestión" }

export default async function IndicatorsPage() {
  const user = await getCurrentUser()
  if (!canSeeIndicators(user)) {
    return (
      <Page>
        <PageHeader title="Indicadores de gestión" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Indicadores"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  // Datos de ejemplo (fase frontend). El backend los reemplaza por queries reales.
  const summary = getIndicatorSummaryMock()
  const items = listIndicatorsMock()
  const processOptions = processOptionsMock()

  return (
    <Page wide>
      <PageHeader
        title="Indicadores de gestión"
        actions={canManageIndicators(user) ? <NewIndicatorSheet processes={processOptions} /> : null}
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <IndicatorSummaryBar summary={summary} />
        <IndicatorBoard items={items} />
      </div>
    </Page>
  )
}
