import { LockIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

import { IndicatorBoard } from "@/components/indicadores/indicator-board"
import { IndicatorSummaryBar } from "@/components/indicadores/indicator-summary"
import { NewIndicatorSheet } from "@/components/indicadores/indicator-form-sheet"
import { Page, PageHeader } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getIndicatorSummary, listIndicators, listPositions, listProcesses } from "@/lib/data/queries"
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

  const [summary, items, processes, positions] = await Promise.all([
    getIndicatorSummary(),
    listIndicators(),
    listProcesses(),
    listPositions(),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, code: p.code }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Indicadores de gestión"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/app/indicadores/imprimir"><PrinterIcon /> Imprimir</Link></Button>
            {canManageIndicators(user) && <NewIndicatorSheet processes={processOptions} positions={positionOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <IndicatorSummaryBar summary={summary} />
        <IndicatorBoard items={items} />
      </div>
    </Page>
  )
}
