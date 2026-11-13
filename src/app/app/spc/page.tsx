import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { SpcBoard } from "@/components/spc/spc-board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, listSpcSeries } from "@/lib/data/queries"
import { canSeeSpc } from "@/lib/domain/access"

export const metadata: Metadata = { title: "SPC" }

export default async function SpcPage() {
  const user = await getCurrentUser()
  if (!canSeeSpc(user)) {
    return (
      <Page>
        <PageHeader title="SPC / Control de proceso" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a SPC"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const series = await listSpcSeries()

  return (
    <Page wide>
      <PageHeader title="SPC / Control de proceso" description="Cartas de individuos (I-MR), capacidad y señales de descontrol sobre las mediciones de inspección." />
      <SpcBoard series={series} />
    </Page>
  )
}
