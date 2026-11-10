import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { ChannelChip, PqrsStatusBadge, PqrsTypeChip } from "@/components/pqrs/badges"
import { PqrsClose, PqrsHeaderActions, PqrsManageActions, PqrsNcAction, PqrsResponse } from "@/components/pqrs/pqrs-manage"
import { PqrsStepper } from "@/components/pqrs/pqrs-stepper"
import { isOpen } from "@/components/pqrs/labels"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPqrs } from "@/lib/data/pqrs-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canSeePqrs } from "@/lib/domain/access"
import { formatDate, todayIsoDate } from "@/lib/format"

export const metadata: Metadata = { title: "PQRS" }

export default async function PqrsDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeePqrs(user)) notFound()

  const pqrs = await getPqrs(decodeURIComponent(codigo))
  if (!pqrs) notFound()

  const overdue = isOpen(pqrs.status) && pqrs.dueDate < todayIsoDate()

  return (
    <Page>
      <Link href="/app/pqrs" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> PQRS
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{pqrs.code}</p>
              <h1 className="mt-0.5">{pqrs.customerName ?? "Cliente no identificado"}</h1>
            </div>
            {pqrs.canManage && <PqrsHeaderActions pqrs={pqrs} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PqrsTypeChip type={pqrs.type} />
            <PqrsStatusBadge status={pqrs.status} />
            <ChannelChip channel={pqrs.channel} />
            {pqrs.processName && <span className="text-small text-texto-sec">· Proceso {pqrs.processName}</span>}
            <span className={`text-small ${overdue ? "font-medium text-advertencia-texto" : "text-texto-sec"}`}>
              · {isOpen(pqrs.status) ? "Vence" : "Vencía"} {formatDate(pqrs.dueDate)}{overdue ? " (vencida)" : ""}
            </span>
          </div>
          <PqrsStepper status={pqrs.status} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Datos</CardTitle>
            {pqrs.canManage && <PqrsManageActions pqrs={pqrs} />}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-body whitespace-pre-wrap">{pqrs.description}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Recibida</dt><dd>{formatDate(pqrs.receivedDate)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Responsable</dt><dd>{pqrs.responsibleName ?? "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-texto-sec">Cliente (dato personal)</dt>
                <dd>{[pqrs.customerName, pqrs.customerContact].filter(Boolean).join(" · ") || "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Respuesta al cliente</CardTitle></CardHeader>
          <CardContent><PqrsResponse pqrs={pqrs} /></CardContent>
        </Card>

        {pqrs.type === "reclamo" && (
          <Card>
            <CardHeader><CardTitle>No conformidad</CardTitle></CardHeader>
            <CardContent><PqrsNcAction pqrs={pqrs} /></CardContent>
          </Card>
        )}

        {isOpen(pqrs.status) && pqrs.canManage && (
          <Card>
            <CardHeader><CardTitle>Cierre</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-small text-texto-sec">Al cerrar se registra si el cliente quedó conforme. Requiere respuesta registrada.</p>
              <div><PqrsClose pqrs={pqrs} /></div>
            </CardContent>
          </Card>
        )}

        {!isOpen(pqrs.status) && pqrs.satisfied !== null && (
          <Card>
            <CardHeader><CardTitle>Cierre</CardTitle></CardHeader>
            <CardContent>
              <p className="text-body">Cliente {pqrs.satisfied ? "conforme" : "no conforme"} con la respuesta.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={pqrs.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
