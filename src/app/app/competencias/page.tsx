import { LockIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CompetencyMatrixBoard } from "@/components/competencias/matrix-board"
import { CompetencySummaryBar } from "@/components/competencias/summary"
import { Page, PageHeader } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getCompetencyMatrix, getCompetencySummary } from "@/lib/data/competencias-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canManageCompetencies, canSeeCompetencies } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Competencias" }

export default async function CompetenciasPage() {
  const user = await getCurrentUser()
  if (!canSeeCompetencies(user)) {
    return (
      <Page>
        <PageHeader title="Competencias" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Competencias"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  const [summary, matrix] = await Promise.all([getCompetencySummary(), getCompetencyMatrix()])
  const canManage = canManageCompetencies(user)

  return (
    <Page wide>
      <PageHeader
        title="Competencias"
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild><Link href="/app/competencias/catalogo">Catálogo</Link></Button>
              <Button variant="outline" asChild><Link href="/app/competencias/formacion">Formación</Link></Button>
            </div>
          ) : null
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <CompetencySummaryBar summary={summary} />
        <CompetencyMatrixBoard matrix={matrix} />
      </div>
    </Page>
  )
}
