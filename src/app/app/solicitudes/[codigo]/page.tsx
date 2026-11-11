import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { ApprovalStepper } from "@/components/solicitudes/approval-stepper"
import { SolicitudStatusBadge } from "@/components/solicitudes/labels"
import { StepActions } from "@/components/solicitudes/step-actions"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getApprovalRequest, getCurrentUser } from "@/lib/data/queries"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Solicitud" }

export default async function SolicitudPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  const sol = await getApprovalRequest(decodeURIComponent(codigo), user)
  if (!sol) notFound()

  return (
    <Page>
      <Link href="/app/solicitudes" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Solicitudes
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{sol.code}</p>
              <h1 className="mt-0.5">{sol.title}</h1>
            </div>
            <StepActions requestId={sol.id} canDecide={sol.canDecide} canCancel={sol.canCancel} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SolicitudStatusBadge status={sol.status} />
            <span className="text-small text-texto-sec">· {sol.flowName} · Radicó {sol.requesterName} · {formatDate(sol.createdAt)}</span>
          </div>
        </div>

        {sol.description && (
          <Card>
            <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body text-texto">{sol.description}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Aprobación</CardTitle></CardHeader>
          <CardContent><ApprovalStepper steps={sol.steps} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={sol.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
