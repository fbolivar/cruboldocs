import { CheckCircle2Icon, ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DispositionBadge, InspectionTypeChip } from "@/components/inspecciones/badges"
import { RejectedActions } from "@/components/inspecciones/inspection-actions"
import { InspectionResultsTable } from "@/components/inspecciones/results-table"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getInspection } from "@/lib/data/queries"
import { canSeeInspections } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Inspección" }

export default async function InspeccionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeInspections(user)) notFound()

  const ins = await getInspection(decodeURIComponent(codigo))
  if (!ins) notFound()

  const overAc = ins.acceptanceNumber !== null && ins.defects > ins.acceptanceNumber
  const released = ins.disposition === "aceptado" || ins.disposition === "concesion"

  return (
    <Page>
      <Link href="/app/inspecciones" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Inspecciones
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="font-mono text-small text-texto-sec">{ins.code}</p>
            <h1 className="mt-0.5">{ins.planName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InspectionTypeChip type={ins.type} />
            <DispositionBadge disposition={ins.disposition} />
            {ins.supplierName && <span className="text-small text-texto-sec">· {ins.supplierName}</span>}
            {ins.processName && <span className="text-small text-texto-sec">· {ins.processName}</span>}
            <span className="text-small text-texto-sec">· {formatDate(ins.inspectedAt)}</span>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Muestreo</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body sm:grid-cols-4">
              <div><dt className="text-caption text-texto-sec">Lote</dt><dd>{ins.lotRef ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Tamaño de lote</dt><dd className="tabular-nums">{ins.lotSize ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Muestra</dt><dd className="tabular-nums">{ins.sampleSize ?? "—"}</dd></div>
              <div>
                <dt className="text-caption text-texto-sec">Defectos / Ac</dt>
                <dd className={`tabular-nums ${overAc ? "font-medium text-error-texto" : ""}`}>
                  {ins.defects} / {ins.acceptanceNumber ?? "—"}{overAc ? " (excede Ac)" : ""}
                </dd>
              </div>
            </dl>
            {ins.note && <p className="mt-3 text-small text-texto-sec">{ins.note}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resultados</CardTitle></CardHeader>
          <CardContent><InspectionResultsTable results={ins.results} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Disposición</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ins.disposition === "rechazado" ? (
              ins.ncCode || ins.ncOutputCode ? (
                <div className="flex flex-col gap-2 text-small">
                  {ins.ncCode && <Link href="/app/no-conformidades" className="font-medium text-acento hover:underline">No conformidad {ins.ncCode}</Link>}
                  {ins.ncOutputCode && <Link href="/app/salidas-no-conformes" className="font-medium text-acento hover:underline">Salida no conforme {ins.ncOutputCode}</Link>}
                  {ins.canManage && !(ins.ncCode && ins.ncOutputCode) && <RejectedActions inspectionId={ins.id} />}
                </div>
              ) : ins.canManage ? (
                <>
                  <p className="text-small text-texto-sec">Esta inspección fue rechazada. Puedes abrir una no conformidad o registrar una salida no conforme.</p>
                  <RejectedActions inspectionId={ins.id} />
                </>
              ) : (
                <p className="text-small text-texto-sec">Inspección rechazada.</p>
              )
            ) : released ? (
              <p className="inline-flex items-center gap-2 text-small text-exito-texto">
                <CheckCircle2Icon className="size-4" /> Producto liberado ({ins.disposition === "concesion" ? "por concesión" : "aceptado"}).
              </p>
            ) : (
              <p className="text-small text-texto-sec">Inspección pendiente de disposición.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={ins.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
