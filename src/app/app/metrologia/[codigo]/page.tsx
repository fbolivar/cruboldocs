import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EquipmentStatusBadge } from "@/components/metrologia/badges"
import { CalibrationList, EquipmentHeaderActions, ExportCalibrationsCsvButton } from "@/components/metrologia/equipment-detail"
import { FREQUENCY_LABELS } from "@/components/metrologia/labels"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getEquipment, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeMetrology } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Equipo de medición" }

export default async function EquipmentPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeMetrology(user)) notFound()

  const e = await getEquipment(decodeURIComponent(codigo))
  if (!e) notFound()
  const [processes, positions] = await Promise.all([
    e.canManage ? listProcesses() : Promise.resolve([]),
    e.canManage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/metrologia" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Metrología
      </Link>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{e.code}</p>
              <h1 className="mt-0.5">{e.name}</h1>
            </div>
            <EquipmentHeaderActions equipment={e} processes={processOptions} positions={positionOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EquipmentStatusBadge status={e.effectiveStatus} />
            {e.processName && <span className="text-small text-texto-sec">· Proceso {e.processName}</span>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Datos del equipo</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Tipo</dt><dd>{e.type ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Ubicación</dt><dd>{e.location ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Rango</dt><dd>{e.measurementRange ?? "—"}{e.unit ? ` ${e.unit}` : ""}</dd></div>
              <div><dt className="text-caption text-texto-sec">Frecuencia</dt><dd>{FREQUENCY_LABELS[e.frequency]}</dd></div>
              <div><dt className="text-caption text-texto-sec">Última calibración</dt><dd>{e.lastCalibrationDate ? formatDate(e.lastCalibrationDate) : "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Próxima</dt><dd className={e.effectiveStatus === "vencido" ? "text-error-texto" : ""}>{e.nextDueDate ? formatDate(e.nextDueDate) : "—"}{e.effectiveStatus === "vencido" ? " (vencida)" : ""}</dd></div>
              <div><dt className="text-caption text-texto-sec">Responsable</dt><dd>{e.responsibleName ?? "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Calibraciones ({e.calibrations.length})</CardTitle>
            {e.calibrations.length > 0 && <ExportCalibrationsCsvButton code={e.code} />}
          </CardHeader>
          <CardContent><CalibrationList items={e.calibrations} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={e.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
