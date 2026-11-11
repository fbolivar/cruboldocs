import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcOutputStatusBadge } from "@/components/salidas-no-conformes/badges"
import { DISPOSITION_LABELS } from "@/components/salidas-no-conformes/labels"
import { CloseOutputButton, DispositionSheet, EditNcOutputSheet, GenerateNcButton } from "@/components/salidas-no-conformes/ficha-actions"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getNcOutput, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeNcOutputs } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Salida no conforme" }

const STEPS = ["abierto", "tratado", "cerrado"] as const

export default async function SalidaNoConformePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeNcOutputs(user)) notFound()

  const o = await getNcOutput(decodeURIComponent(codigo))
  if (!o) notFound()

  const manage = o.canManage && o.status !== "cerrado" && o.status !== "anulado"
  const [processes, positions] = await Promise.all([
    manage ? listProcesses() : Promise.resolve([]),
    manage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))
  const stepIdx = o.status === "cerrado" ? 2 : o.status === "tratado" ? 1 : 0

  return (
    <Page>
      <Link href="/app/salidas-no-conformes" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Salidas no conformes
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{o.code}</p>
              <h1 className="mt-0.5">{o.description}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {manage && <EditNcOutputSheet output={o} processes={processOptions} />}
              {manage && o.disposition == null && <DispositionSheet output={o} positions={positionOptions} />}
              {manage && <CloseOutputButton output={o} />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NcOutputStatusBadge status={o.status} />
            {o.processName && <span className="text-small text-texto-sec">· {o.processName}</span>}
            <span className="text-small text-texto-sec">· detectada {formatDate(o.detectedDate)}</span>
          </div>
          {o.status !== "anulado" && (
            <div className="flex items-center gap-2 text-caption text-texto-sec">
              {STEPS.map((s, i) => (
                <span key={s} className={i <= stepIdx ? "font-medium text-acento" : ""}>
                  {i > 0 && <span className="mr-2 text-borde-fuerte">──</span>}
                  {s === "abierto" ? "Abierta" : s === "tratado" ? "Tratada" : "Cerrada"}
                </span>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-body">
            {o.identification && <p><span className="text-texto-sec">Identificación:</span> {o.identification}</p>}
            <p><span className="text-texto-sec">Proceso:</span> {o.processName ?? "—"}</p>
            <p><span className="text-texto-sec">Fecha de detección:</span> {formatDate(o.detectedDate)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Disposición (8.7)</CardTitle>
            {manage && o.disposition != null && <DispositionSheet output={o} positions={positionOptions} />}
          </CardHeader>
          <CardContent>
            {o.disposition == null ? (
              <p className="text-small text-texto-sec">Aún sin disposición. {manage ? "Aplica una para poder cerrar." : ""}</p>
            ) : (
              <div className="flex flex-col gap-1.5 text-body">
                <p><span className="text-texto-sec">Tipo:</span> {DISPOSITION_LABELS[o.disposition]}</p>
                {o.dispositionDetail && <p><span className="text-texto-sec">Detalle:</span> {o.dispositionDetail}</p>}
                <p><span className="text-texto-sec">¿Informado al cliente?</span> {o.customerInformed ? "Sí" : "No"}</p>
                <p><span className="text-texto-sec">Responsable:</span> {o.responsibleName ?? "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>No conformidad</CardTitle></CardHeader>
          <CardContent>
            {o.nonconformityCode ? (
              <Link href="/app/no-conformidades" className="text-body font-medium text-acento hover:underline">→ {o.nonconformityCode}</Link>
            ) : manage ? (
              <GenerateNcButton output={o} />
            ) : (
              <p className="text-small text-texto-sec">Sin no conformidad asociada.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={o.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
