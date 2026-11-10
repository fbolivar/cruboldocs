import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewSupplierSheet, ExportSuppliersButton } from "@/components/proveedores/new-supplier-sheet"
import { SupplierBoard } from "@/components/proveedores/supplier-board"
import { SupplierSummaryBar } from "@/components/proveedores/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getSupplierSummary, listProcesses, listSuppliers } from "@/lib/data/queries"
import { canManageSuppliers, canSeeSuppliers } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Proveedores" }

export default async function ProveedoresPage() {
  const user = await getCurrentUser()
  if (!canSeeSuppliers(user)) {
    return (
      <Page>
        <PageHeader title="Proveedores" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Proveedores"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, items, processes] = await Promise.all([getSupplierSummary(), listSuppliers(), listProcesses()])
  const canManage = canManageSuppliers(user)
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Proveedores"
        actions={
          <div className="flex gap-2">
            <ExportSuppliersButton />
            {canManage && <NewSupplierSheet processes={processOptions} />}
          </div>
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <SupplierSummaryBar summary={summary} />
        <SupplierBoard items={items} />
      </div>
    </Page>
  )
}
