import { ChevronLeftIcon, PlayIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CourseStatusBadge } from "@/components/capacitacion/badges"
import { CourseResults } from "@/components/capacitacion/course-results"
import { CourseDataSheet, ExportCourseResultsCsvButton, PublishCourseButton } from "@/components/capacitacion/courses-manage"
import { QuestionDesigner } from "@/components/capacitacion/question-designer"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCourse, getCurrentUser, listProcesses } from "@/lib/data/queries"
import { canSeeCourses } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Curso" }

export default async function CursoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeCourses(user)) notFound()

  const c = await getCourse(decodeURIComponent(codigo))
  if (!c) notFound()

  const processes = c.canManage ? await listProcesses() : []
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const editable = c.canManage && c.status === "borrador"

  return (
    <Page>
      <Link href="/app/capacitacion" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Capacitación
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{c.code}</p>
              <h1 className="mt-0.5">{c.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === "publicado" && c.canTake && (
                <Button asChild size="sm"><Link href={`/app/capacitacion/${c.code}/tomar`}><PlayIcon /> Tomar</Link></Button>
              )}
              {c.canManage && c.status !== "archivado" && <CourseDataSheet course={c} processes={processOptions} />}
              {c.canManage && c.status === "borrador" && <PublishCourseButton course={c} />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CourseStatusBadge status={c.status} />
            <span className="text-small text-texto-sec">Aprob. {c.passingScore}%</span>
            {c.processName && <span className="text-small text-texto-sec">· Proceso {c.processName}</span>}
            <span className="text-small text-texto-sec">· {c.questions.length} preguntas</span>
          </div>
          {c.description && <p className="text-body text-texto-sec">{c.description}</p>}
        </div>

        <Card>
          <CardHeader><CardTitle>Material</CardTitle></CardHeader>
          <CardContent>
            {c.content ? (
              <p className="whitespace-pre-wrap text-body text-texto-sec">{c.content}</p>
            ) : (
              <p className="text-small text-texto-sec">Sin material. {c.canManage ? "Agrégalo con «Editar»." : ""}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evaluación ({c.questions.length} preguntas)</CardTitle></CardHeader>
          <CardContent>
            {!editable && c.canManage && c.status === "publicado" && (
              <p className="mb-3 text-small text-texto-sec">Las preguntas quedan fijas tras publicar.</p>
            )}
            <QuestionDesigner courseId={c.id} questions={c.questions} canEdit={editable} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Resultados ({c.enrollments.length})</CardTitle>
            {c.canManage && c.enrollments.length > 0 && <ExportCourseResultsCsvButton code={c.code} />}
          </CardHeader>
          <CardContent><CourseResults enrollments={c.enrollments} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={c.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
