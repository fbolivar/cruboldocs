import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CourseTaker } from "@/components/capacitacion/course-taker"
import { Page } from "@/components/shell/page"
import { getCourseToTake, getCurrentUser } from "@/lib/data/queries"
import { canTakeCourses } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Tomar curso" }

export default async function TomarCursoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canTakeCourses(user)) notFound()

  const course = await getCourseToTake(decodeURIComponent(codigo))
  if (!course) notFound()

  return (
    <Page>
      <Link href={`/app/capacitacion/${course.code}`} className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Capacitación
      </Link>
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-mono text-small text-texto-sec">{course.code}</p>
          <h1 className="mt-0.5">{course.title}</h1>
        </div>
        <CourseTaker course={course} userName={user.fullName} />
      </div>
    </Page>
  )
}
