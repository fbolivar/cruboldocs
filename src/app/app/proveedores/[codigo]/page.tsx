import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { CriticalityChip, SupplierKindChip, SupplierStatusBadge } from "@/components/proveedores/badges"
import { ScoreMeter } from "@/components/proveedores/score-meter"
import { SupplierActions } from "@/components/proveedores/supplier-actions"
import { EvaluateSupplierSheet, EvaluationHistory } from "@/components/proveedores/supplier-evaluations"
import { SupplierSelfAssessmentPanel } from "@/components/portal/supplier-self-assessment-panel"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getSupplier } from "@/lib/data/queries"
import { canSeeSuppliers } from "@/lib/domain/access"
import { formatDate, todayIsoDate } from "@/lib/format"

export const metadata: Metadata = { title: "Proveedor" }

export default async function SupplierPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeSuppliers(user)) notFound()

  const supplier = await getSupplier(decodeURIComponent(codigo))
  if (!supplier) notFound()

  const canManage = supplier.canManage
  const overdue = supplier.nextEvalDate !== null && supplier.nextEvalDate < todayIsoDate()

  return (
    <Page>
      <Link href="/app/proveedores" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Proveedores
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{supplier.code}</p>
              <h1 className="mt-0.5">{supplier.name}</h1>
            </div>
            {canManage && <SupplierActions supplier={supplier} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SupplierStatusBadge status={supplier.status} />
            <CriticalityChip criticality={supplier.criticality} />
            <SupplierKindChip kind={supplier.kind} />
            {supplier.processName && <span className="text-small text-texto-sec">· Proceso {supplier.processName}</span>}
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Estado vigente</CardTitle>
            {canManage && supplier.isActive && <EvaluateSupplierSheet supplierId={supplier.id} hasEvaluations={supplier.evaluations.length > 0} />}
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ScoreMeter total={supplier.lastScore} />
            <p className="text-small text-texto-sec">
              {supplier.evaluations.length > 0
                ? <>Última evaluación {formatDate(supplier.evaluations[0].evalDate)}
                    {supplier.nextEvalDate && <> · Reevaluar <span className={overdue ? "font-medium text-advertencia-texto" : ""}>{formatDate(supplier.nextEvalDate)}{overdue ? " (vencida)" : ""}</span></>}</>
                : "Proveedor pendiente de evaluación inicial."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">NIT</dt><dd>{supplier.nit ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Categoría</dt><dd>{supplier.category ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Contacto</dt><dd>{supplier.contactName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Correo / teléfono</dt><dd>{[supplier.contactEmail, supplier.contactPhone].filter(Boolean).join(" · ") || "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de evaluaciones</CardTitle></CardHeader>
          <CardContent><EvaluationHistory evaluations={supplier.evaluations} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Autoevaluación del proveedor</CardTitle></CardHeader>
          <CardContent>
            <SupplierSelfAssessmentPanel
              supplierId={supplier.id}
              token={supplier.selfAssessmentToken}
              assessments={supplier.selfAssessments}
              canManage={canManage}
              baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={supplier.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
