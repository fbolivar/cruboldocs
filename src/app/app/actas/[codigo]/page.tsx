import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MeetingTypeChip, MinuteStatusBadge } from "@/components/actas/badges"
import { CommitmentsSection, MinuteHeaderActions } from "@/components/actas/minute-manage"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AiSummaryDialog } from "@/components/ia/ai-summary-dialog"
import { getCurrentUser, getMinute, isAgentEnabled, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeMinutes } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Acta" }

export default async function ActaDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeMinutes(user)) notFound()

  const minute = await getMinute(decodeURIComponent(codigo))
  if (!minute) notFound()

  const [processes, positions] = minute.canManage ? await Promise.all([listProcesses(), listPositions()]) : [[], []]
  const agentEnabled = minute.canManage ? await isAgentEnabled() : false
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/actas" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Actas
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{minute.code}</p>
              <h1 className="mt-0.5">{minute.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {agentEnabled && <AiSummaryDialog task="acta_resumen" code={minute.code} />}
              <MinuteHeaderActions minute={minute} processes={processOptions} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MeetingTypeChip type={minute.meetingType} />
            <MinuteStatusBadge status={minute.status} />
            <span className="text-small text-texto-sec">· {formatDate(minute.meetingDate)}</span>
            {minute.processName && <span className="text-small text-texto-sec">· Proceso {minute.processName}</span>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Tipo</dt><dd className="capitalize">{minute.meetingType}</dd></div>
              <div><dt className="text-caption text-texto-sec">Fecha</dt><dd>{formatDate(minute.meetingDate)}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-texto-sec">Asistentes (dato personal)</dt>
                <dd className="whitespace-pre-wrap">{minute.attendees ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-texto-sec">Temas / orden del día</dt>
                <dd className="whitespace-pre-wrap">{minute.agenda ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compromisos ({minute.commitments.length})</CardTitle></CardHeader>
          <CardContent><CommitmentsSection minute={minute} positions={positionOptions} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={minute.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
