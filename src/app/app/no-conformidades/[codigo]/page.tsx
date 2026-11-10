import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcSeverityBadge, NcStatusBadge } from "@/components/no-conformidades/badges"
import { NcActionsPanel } from "@/components/no-conformidades/nc-actions-panel"
import { NcCancelButton } from "@/components/no-conformidades/nc-cancel-button"
import { NcCause } from "@/components/no-conformidades/nc-cause"
import { NcStepper } from "@/components/no-conformidades/nc-stepper"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { NcVerifyPanel } from "@/components/no-conformidades/nc-verify-panel"
import { SOURCE_LABELS } from "@/components/no-conformidades/labels"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getNonconformity, listPositions } from "@/lib/data/queries"
import { canSeeNonconformities } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "No conformidad" }

export default async function NonconformityPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeNonconformities(user)) notFound()

  const [nc, positions] = await Promise.all([getNonconformity(decodeURIComponent(codigo)), listPositions()])
  if (!nc) notFound()
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/no-conformidades" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> No conformidades
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Encabezado */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{nc.code}</p>
              <h1 className="mt-0.5">{nc.title}</h1>
            </div>
            {nc.canManage && nc.status !== "cerrada" && nc.status !== "anulada" && <NcCancelButton ncId={nc.id} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NcStatusBadge status={nc.status} reopened={nc.reopenedCount > 0} />
            <NcSeverityBadge severity={nc.severity} />
            <span className="text-small text-texto-sec">
              {nc.processName ? `Proceso ${nc.processName} · ` : ""}Origen: {SOURCE_LABELS[nc.source]}
            </span>
          </div>
          <p className="text-small text-texto-sec">
            {nc.ownerPositionName ? `Dueño: ${nc.ownerPositionName} · ` : ""}Detectada {formatDate(nc.detectedAt)} · por {nc.reportedByName}
          </p>
          <p className="text-body">{nc.description}</p>
        </div>

        {/* Progreso */}
        <Card className="p-4">
          <NcStepper status={nc.status} />
        </Card>

        {/* Análisis de causa */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de causa</CardTitle>
          </CardHeader>
          <CardContent>
            <NcCause ncId={nc.id} cause={nc.rootCause} canManage={nc.canManage} />
          </CardContent>
        </Card>

        {/* Plan de acción */}
        <Card>
          <CardHeader>
            <CardTitle>Plan de acción</CardTitle>
          </CardHeader>
          <CardContent>
            <NcActionsPanel ncId={nc.id} actions={nc.actions} canManage={nc.canManage} positions={positionOptions} />
          </CardContent>
        </Card>

        {/* Verificación de eficacia */}
        <Card>
          <CardHeader>
            <CardTitle>Verificación de eficacia</CardTitle>
          </CardHeader>
          <CardContent>
            <NcVerifyPanel ncId={nc.id} status={nc.status} verification={nc.verification} canManage={nc.canManage} />
          </CardContent>
        </Card>

        {/* Trazabilidad */}
        <Card>
          <CardHeader>
            <CardTitle>Trazabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <NcTimeline events={nc.timeline} />
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
