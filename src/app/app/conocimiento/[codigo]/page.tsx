import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { KNOWLEDGE_CATEGORY_LABELS } from "@/components/conocimiento/labels"
import { EditArticleSheet } from "@/components/conocimiento/manage"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Badge, Chip } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getKnowledgeArticle, listProcesses } from "@/lib/data/queries"
import { canSeeKnowledge } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Artículo de conocimiento" }

export default async function ArticuloPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeKnowledge(user)) notFound()

  const a = await getKnowledgeArticle(decodeURIComponent(codigo))
  if (!a) notFound()

  const processes = a.canManage ? await listProcesses() : []
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/conocimiento" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Conocimiento
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{a.code}</p>
              <h1 className="mt-0.5">{a.title}</h1>
            </div>
            {a.canManage && <EditArticleSheet article={a} processes={processOptions} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{KNOWLEDGE_CATEGORY_LABELS[a.category]}</Chip>
            {a.status === "archivado" && <Badge tone="neutro">Archivado</Badge>}
            {a.processName && <span className="text-small text-texto-sec">· {a.processName}</span>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Contenido</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-body text-texto">{a.content}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Origen</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-body">
            {a.source && <p><span className="text-texto-sec">Fuente:</span> {a.source}</p>}
            {a.sourceNcCode && <Link href="/app/no-conformidades" className="font-medium text-acento hover:underline">→ {a.sourceNcCode}</Link>}
            {a.sourceAuditCode && <Link href="/app/auditorias" className="font-medium text-acento hover:underline">→ {a.sourceAuditCode}</Link>}
            {!a.source && !a.sourceNcCode && !a.sourceAuditCode && <p className="text-small text-texto-sec">Sin origen registrado.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={a.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
