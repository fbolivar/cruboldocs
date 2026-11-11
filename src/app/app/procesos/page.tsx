import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { ProcessMap } from "@/components/procesos/process-map"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getProcessMap } from "@/lib/data/queries"
import { canSeeProcessMap } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Procesos" }

export default async function ProcesosPage() {
  const user = await getCurrentUser()
  if (!canSeeProcessMap(user)) {
    return (
      <Page>
        <PageHeader title="Procesos" />
        <EmptyState icon={LockIcon} title="No tienes acceso a los procesos" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const { summary, items } = await getProcessMap()

  return (
    <Page wide>
      <PageHeader title="Procesos" />
      <ProcessMap summary={summary} items={items} />
    </Page>
  )
}
