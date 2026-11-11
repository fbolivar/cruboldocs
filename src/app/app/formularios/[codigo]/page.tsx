import { ChevronLeftIcon, FilePlus2Icon, PencilRulerIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormCategoryChip, FormStatusBadge } from "@/components/formularios/badges"
import { ExportFormCsvButton } from "@/components/formularios/forms-manage"
import { SubmissionsList, TemplateStructure } from "@/components/formularios/submissions"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getFormTemplate, listSubmissions } from "@/lib/data/queries"
import { canSeeForms } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Plantilla de formulario" }

export default async function FormTemplatePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeForms(user)) notFound()

  const t = await getFormTemplate(decodeURIComponent(codigo))
  if (!t) notFound()

  const submissions = await listSubmissions(t.id)
  const dataFieldCount = t.fields.filter((f) => f.type !== "seccion").length

  return (
    <Page>
      <Link href="/app/formularios" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Formularios
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{t.code}</p>
              <h1 className="mt-0.5">{t.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.status === "publicado" && t.canFill && (
                <Button asChild size="sm"><Link href={`/app/formularios/${t.code}/responder`}><FilePlus2Icon /> Diligenciar</Link></Button>
              )}
              {t.canManage && (
                <Button asChild variant="outline" size="sm"><Link href={`/app/formularios/${t.code}/disenar`}><PencilRulerIcon /> Diseñar</Link></Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FormCategoryChip category={t.category} />
            <FormStatusBadge status={t.status} version={t.publishedVersion ?? t.draftVersion} />
            {t.processName && <span className="text-small text-texto-sec">· Proceso {t.processName}</span>}
            <span className="text-small text-texto-sec">· {dataFieldCount} campos</span>
          </div>
          {t.description && <p className="text-body text-texto-sec">{t.description}</p>}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Respuestas ({submissions.filter((s) => s.status === "enviada").length})</CardTitle>
            {submissions.some((s) => s.status === "enviada") && <ExportFormCsvButton code={t.code} />}
          </CardHeader>
          <CardContent>
            {t.status === "borrador" ? (
              <p className="text-small text-texto-sec">Publica la plantilla para empezar a recolectar respuestas.</p>
            ) : (
              <SubmissionsList submissions={submissions} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Estructura (v{t.publishedVersion ?? t.draftVersion})</CardTitle></CardHeader>
          <CardContent><TemplateStructure fields={t.fields} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={t.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
