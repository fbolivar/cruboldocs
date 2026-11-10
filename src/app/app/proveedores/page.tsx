import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewSupplierSheet, ExportSuppliersButton } from "@/components/proveedores/new-supplier-sheet"
import { SupplierBoard } from "@/components/proveedores/supplier-board"
import { SupplierSummaryBar } from "@/components/proveedores/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getSupplierSummary, listSuppliers } from "@/lib/data/proveedores-mock"
import { getCurrentUser } from "@/lib/data/queries"
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

  const [summary, items] = await Promise.all([getSupplierSummary(), listSuppliers()])
  const canManage = canManageSuppliers(user)

  return (
    <Page wide>
      <PageHeader
        title="Proveedores"
        actions={
          <div className="flex gap-2">
            <ExportSuppliersButton />
            {canManage && <NewSupplierSheet processes={[]} />}
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
