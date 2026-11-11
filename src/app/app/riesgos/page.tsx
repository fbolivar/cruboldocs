import { PlusIcon, ShieldOffIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ExportRisksButton } from "@/components/riesgos/export-risks-button"
import type { Option } from "@/components/riesgos/filter-controls"
import { IdentifyRiskSheet } from "@/components/riesgos/identify-risk-sheet"
import { RiskList } from "@/components/riesgos/risk-list"
import { RiskListFilters } from "@/components/riesgos/risk-list-filters"
import { RiskMatrixSection } from "@/components/riesgos/risk-matrix-section"
import { RiskPanel } from "@/components/riesgos/risk-panel"
import { parseRiskParams, RISKS_PATH } from "@/components/riesgos/risk-params"
import { RiskTopFilters } from "@/components/riesgos/risk-top-filters"
import { Page, PageHeader } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getEntityNorms, getRisk, getRiskMatrix, listActiveNorms, listPositions, listProcesses, listRiskCategories, listRisks } from "@/lib/data/queries"
import { canManageRisks, canSeeRisks, canTagNorms } from "@/lib/domain/access"
import { withParams } from "@/lib/url"

export const metadata: Metadata = { title: "Riesgos" }

/** Una consulta que falla no tumba la página: la sección correspondiente muestra su error. */
const orNull = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null)

export default async function RiesgosPage({ searchParams }: PageProps<"/app/riesgos">) {
  const user = await getCurrentUser()
  if (!canSeeRisks(user)) {
    return (
      <Page>
        <EmptyState
          icon={ShieldOffIcon}
          title="No tienes acceso a riesgos"
          description="Tu cargo no tiene roles de gestión de riesgos. Si lo necesitas, pídelo al Líder SIG."
          action={
            <Button variant="outline" asChild>
              <Link href="/app">Ir a Inicio</Link>
            </Button>
          }
        />
      </Page>
    )
  }

  const sp = await searchParams
  const { filters, page, riskId, identify } = parseRiskParams(sp)
  const canManage = canManageRisks(user)

  const [matrix, list, risk, processes, categories, positions] = await Promise.all([
    orNull(getRiskMatrix(filters)),
    orNull(listRisks({ ...filters, page })),
    riskId ? orNull(getRisk(riskId)) : Promise.resolve(null),
    listProcesses().catch(() => []),
    listRiskCategories().catch(() => []),
    listPositions().catch(() => []),
  ])
  const [allNorms, taggedNorms] = await Promise.all([
    listActiveNorms().catch(() => []),
    riskId ? getEntityNorms("riesgo", riskId).catch(() => []) : Promise.resolve([]),
  ])

  const processOptions: Option[] = processes.map((p) => ({ value: p.id, label: p.name }))
  const categoryOptions: Option[] = categories.map((c) => ({ value: c, label: c }))
  const positionOptions: Option[] = positions.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Riesgos"
        actions={
          <>
            <ExportRisksButton filters={filters} />
            {canManage && (
              <Button asChild>
                <Link href={withParams(RISKS_PATH, sp, { identificar: 1, riesgo: null })} scroll={false}>
                  <PlusIcon aria-hidden="true" />
                  Identificar riesgo
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <RiskTopFilters filters={filters} processes={processOptions} categories={categoryOptions} />
        <RiskMatrixSection matrix={matrix} activeCell={filters.cell} />
      </div>

      <section aria-label="Lista de riesgos" className="flex flex-col gap-4">
        <RiskListFilters filters={filters} />
        <RiskList result={list} filters={filters} sp={sp} selectedId={riskId} canManage={canManage} />
      </section>

      {riskId && !identify && (
        <RiskPanel
          key={riskId}
          risk={risk}
          positions={positionOptions}
          norms={allNorms}
          taggedNorms={taggedNorms}
          canTag={risk ? canTagNorms(user) : false}
          viewer={{
            me: { id: user.id, fullName: user.fullName, positionName: user.positionName ?? "" },
            positionId: user.positionId,
            // Líder de proceso: solo gestiona los riesgos de su proceso.
            canManage: risk ? canManageRisks(user, risk.processId) : false,
          }}
        />
      )}
      {identify && canManage && <IdentifyRiskSheet processes={processOptions} categories={categoryOptions} positions={positionOptions} />}
    </Page>
  )
}
