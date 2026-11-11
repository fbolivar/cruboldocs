import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportField, ReportSection, ReportShell, ReportTable } from "@/components/informes/report"
import { OUTPUT_KIND_LABELS, REVIEW_STATUS_LABELS } from "@/components/revisiones/labels"
import { getCurrentUser, getReview } from "@/lib/data/queries"
import { canSeeReviews } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Informe · Revisión por la dirección", robots: { index: false, follow: false } }

export default async function ReviewReportPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeReviews(user)) notFound()
  const r = await getReview(decodeURIComponent(codigo))
  if (!r) notFound()

  return (
    <ReportShell
      backHref={`/app/revisiones/${r.code}`}
      organizationName={user.organization.name}
      title={`Acta de revisión por la dirección — ${r.title}`}
      code={r.code}
      emittedBy={user.fullName}
    >
      <ReportSection title="Datos del acta">
        <dl>
          <ReportField label="Periodo" value={`${formatDate(r.periodStart)} a ${formatDate(r.periodEnd)}`} />
          <ReportField label="Fecha de reunión" value={formatDate(r.meetingDate)} />
          <ReportField label="Estado" value={REVIEW_STATUS_LABELS[r.status]} />
          <ReportField label="Alcance" value={r.scope} />
          <ReportField label="Asistentes" value={r.attendees} />
        </dl>
      </ReportSection>

      <ReportSection title="Entradas (9.3.2)">
        <dl>
          <ReportField label="Satisfacción del cliente" value={r.inputs.satisfaccion} />
          <ReportField label="Retroalimentación" value={r.inputs.retroalimentacion} />
          <ReportField label="Desempeño de proveedores" value={r.inputs.proveedores} />
          <ReportField label="Recursos" value={r.inputs.recursos} />
          <ReportField label="Oportunidades de mejora" value={r.inputs.mejora} />
        </dl>
      </ReportSection>

      <ReportSection title="Salidas y decisiones (9.3.3)">
        <ReportTable
          columns={["Tipo", "Descripción", "Responsable", "Plazo", "NC"]}
          rows={r.outputs.map((o) => [
            OUTPUT_KIND_LABELS[o.kind], o.description, o.responsibleName ?? "—",
            o.dueDate ? formatDate(o.dueDate) : "—", o.nonconformityCode ?? "—",
          ])}
        />
      </ReportSection>

      <ReportSection title="Aprobación">
        <dl>
          <ReportField label="Aprobada por" value={r.approvedByName} />
          <ReportField label="Fecha de aprobación" value={r.approvedAt ? formatDate(r.approvedAt) : null} />
        </dl>
      </ReportSection>
    </ReportShell>
  )
}
