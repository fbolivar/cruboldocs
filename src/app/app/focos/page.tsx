import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { FocosBoard } from "@/components/focos/focos-board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { computeFocos, getCurrentUser } from "@/lib/data/queries"
import { canSeeFocos } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Focos de riesgo" }

export default async function FocosPage() {
  const user = await getCurrentUser()
  if (!canSeeFocos(user)) {
    return (
      <Page>
        <PageHeader title="Focos de riesgo" />
        <EmptyState icon={LockIcon} title="No tienes acceso a Focos" description="Si participas en el SIG, pide acceso al administrador." />
      </Page>
    )
  }
  const focos = await computeFocos()

  return (
    <Page wide>
      <PageHeader title="Focos de riesgo" description="Señales calculadas de tus datos; revisa y actúa." />
      <FocosBoard focos={focos} />
    </Page>
  )
}
