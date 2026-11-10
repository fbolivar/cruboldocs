import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewReviewSheet } from "@/components/revisiones/new-review-sheet"
import { ReviewBoard } from "@/components/revisiones/review-board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { listReviewsMock } from "@/lib/data/reviews-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canManageReviews, canSeeReviews } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Revisión por la dirección" }

export default async function ReviewsPage() {
  const user = await getCurrentUser()
  if (!canSeeReviews(user)) {
    return (
      <Page>
        <PageHeader title="Revisión por la dirección" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Revisión por la dirección"
          description="Si participas en el SIG de tu organización, pide acceso al administrador."
        />
      </Page>
    )
  }

  // Datos de ejemplo (fase frontend). El backend los reemplaza por queries reales.
  const items = listReviewsMock()

  return (
    <Page wide>
      <PageHeader
        title="Revisión por la dirección"
        actions={canManageReviews(user) ? <NewReviewSheet /> : null}
      />
      <ReviewBoard items={items} />
    </Page>
  )
}
