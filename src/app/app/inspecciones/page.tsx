import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { InspectionsBoard } from "@/components/inspecciones/board"
import { NewInspectionSheet, ExportInspectionsButton } from "@/components/inspecciones/new-inspection-sheet"
import { InspectionSummaryBar } from "@/components/inspecciones/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getCurrentUser,
  getInspectionSummary,
  listActiveInspectionPlanOptions,
  listInspectionPlans,
  listInspections,
  listProcesses,
  listSuppliers,
} from "@/lib/data/queries"
import { canManageInspections, canSeeInspections } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Inspecciones" }

export default async function InspeccionesPage() {
  const user = await getCurrentUser()
  if (!canSeeInspections(user)) {
    return (
      <Page>
        <PageHeader title="Inspecciones" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Inspecciones"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const canManage = canManageInspections(user)
  const [summary, items, plans, planOptions, processes, suppliers] = await Promise.all([
    getInspectionSummary(),
    listInspections(),
    canManage ? listInspectionPlans() : Promise.resolve([]),
    listActiveInspectionPlanOptions(),
    listProcesses(),
    listSuppliers(),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }))

  return (
    <Page wide>
      <PageHeader
        title="Inspecciones"
        actions={
          <div className="flex gap-2">
            <ExportInspectionsButton />
            {canManage && <NewInspectionSheet plans={planOptions} suppliers={supplierOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <InspectionSummaryBar summary={summary} />
        <InspectionsBoard items={items} plans={plans} processes={processOptions} canManage={canManage} />
      </div>
    </Page>
  )
}
