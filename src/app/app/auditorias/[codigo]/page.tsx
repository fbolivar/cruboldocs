import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AuditStatusBadge } from "@/components/auditorias/badges"
import { AuditCancelButton } from "@/components/auditorias/audit-cancel-button"
import { AuditCloseForm } from "@/components/auditorias/audit-close-form"
import { AuditStepper } from "@/components/auditorias/audit-stepper"
import { FindingList } from "@/components/auditorias/finding-list"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAudit, getCurrentUser, listProcesses } from "@/lib/data/queries"
import { canSeeAudits } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Auditoría" }

export default async function AuditPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeAudits(user)) notFound()

  const [audit, processes] = await Promise.all([getAudit(decodeURIComponent(codigo)), listProcesses()])
  if (!audit) notFound()
  const processOptions = processes.map((p) => ({ id: p.id, code: p.code }))
  const open = audit.status !== "cerrada" && audit.status !== "cancelada"

  return (
    <Page>
      <Link href="/app/auditorias" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Auditorías
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{audit.code}</p>
              <h1 className="mt-0.5">{audit.title}</h1>
            </div>
            {audit.canManage && open && <AuditCancelButton auditId={audit.id} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuditStatusBadge status={audit.status} />
            <span className="text-small text-texto-sec">
              {audit.processNames.length ? `Procesos: ${audit.processNames.join(", ")} · ` : ""}
              Líder auditor: {audit.leadAuditorName ?? "—"}
            </span>
          </div>
          <p className="text-small text-texto-sec">Planificada {formatDate(audit.plannedDate)}</p>
        </div>

        <Card className="p-4">
          <AuditStepper status={audit.status} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alcance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-body">
            <p>
              <span className="text-texto-sec">Objetivo:</span> {audit.objective || "—"}
            </p>
            <p>
              <span className="text-texto-sec">Criterios:</span> {audit.criteria || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <FindingList
              auditId={audit.id}
              findings={audit.findings}
              status={audit.status}
              canAddFinding={audit.canAddFinding}
              canManage={audit.canManage}
              processes={processOptions}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conclusiones y cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditCloseForm auditId={audit.id} status={audit.status} conclusions={audit.conclusions} canManage={audit.canManage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trazabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <NcTimeline events={audit.timeline} />
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
