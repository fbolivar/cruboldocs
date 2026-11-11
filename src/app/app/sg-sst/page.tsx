import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { SstBoard, SstSummaryBar, NewEvaluationSheet } from "@/components/sg-sst/board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getSstSummary, listSstEvaluations } from "@/lib/data/queries"
import { canManageSst, canSeeSst } from "@/lib/domain/access"

export const metadata: Metadata = { title: "SG-SST" }

export default async function SgSstPage() {
  const user = await getCurrentUser()
  if (!canSeeSst(user)) {
    return (
      <Page>
        <PageHeader title="SG-SST" />
        <EmptyState icon={LockIcon} title="No tienes acceso al SG-SST" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageSst(user)
  const [summary, items] = await Promise.all([getSstSummary(), listSstEvaluations()])

  return (
    <Page wide>
      <PageHeader
        title="SG-SST · Estándares Mínimos"
        actions={canManage ? <NewEvaluationSheet /> : undefined}
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <SstSummaryBar summary={summary} />
        <SstBoard items={items} />
      </div>
    </Page>
  )
}
