import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { NewReviewSheet } from "@/components/revisiones/new-review-sheet"
import { ReviewBoard } from "@/components/revisiones/review-board"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, listReviews } from "@/lib/data/queries"
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

  const items = await listReviews()

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
