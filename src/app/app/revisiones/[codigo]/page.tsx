import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { ReviewStatusBadge } from "@/components/revisiones/badges"
import { CancelReviewButton, CloseReviewButton } from "@/components/revisiones/close-review-button"
import { snapshotBlocks } from "@/components/revisiones/labels"
import { RefreshSnapshotButton, ReviewInputsForm } from "@/components/revisiones/review-inputs-form"
import { ReviewOutputList } from "@/components/revisiones/review-outputs"
import { SnapshotCard } from "@/components/revisiones/snapshot-card"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getReviewMock } from "@/lib/data/reviews-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canSeeReviews } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Revisión por la dirección" }

export default async function ReviewPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeReviews(user)) notFound()

  const review = getReviewMock(decodeURIComponent(codigo))
  if (!review) notFound()

  const editable = review.status === "borrador"
  const blocks = snapshotBlocks(review.snapshot)

  return (
    <Page>
      <Link href="/app/revisiones" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Revisiones
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{review.code}</p>
              <h1 className="mt-0.5">{review.title}</h1>
            </div>
            {review.canManage && editable && <CancelReviewButton reviewId={review.id} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReviewStatusBadge status={review.status} />
            <span className="text-small text-texto-sec">
              Periodo {formatDate(review.periodStart)} – {formatDate(review.periodEnd)} · Reunión {formatDate(review.meetingDate)}
            </span>
          </div>
          {review.scope && <p className="text-small text-texto-sec">{review.scope}</p>}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Entradas (9.3.2)</CardTitle>
            {review.canManage && editable && <RefreshSnapshotButton />}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blocks.map((b) => <SnapshotCard key={b.title} block={b} />)}
            </div>
            <div className="border-t border-borde pt-4">
              <ReviewInputsForm inputs={review.inputs} editable={review.canManage && editable} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salidas · Decisiones (9.3.3)</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewOutputList reviewId={review.id} outputs={review.outputs} canManage={review.canManage} editable={editable} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cierre y firma</CardTitle>
          </CardHeader>
          <CardContent>
            {review.status === "cerrada" ? (
              <p className="text-body">
                Firmada por <span className="font-medium">{review.approvedByName ?? "—"}</span>
                {review.approvedAt && ` · ${formatDate(review.approvedAt)}`}.
                <span className="mt-1 block text-small text-texto-sec">El acta cerrada es un registro inmutable.</span>
              </p>
            ) : review.status === "cancelada" ? (
              <p className="text-small text-texto-sec">Acta cancelada. {review.cancelReason}</p>
            ) : review.canManage ? (
              <div className="flex flex-col gap-2">
                <p className="text-small text-texto-sec">Al cerrar, el acta queda firmada e inmutable.</p>
                <div><CloseReviewButton reviewId={review.id} /></div>
              </div>
            ) : (
              <p className="text-small text-texto-sec">El Líder SIG cerrará y firmará el acta.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trazabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <NcTimeline events={review.timeline} />
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
