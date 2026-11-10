import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AssessCompetencySheet, PersonCompetencies } from "@/components/competencias/person-competencies"
import { PersonTrainings } from "@/components/competencias/person-trainings"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getPersonCompetencies } from "@/lib/data/queries"
import { canSeeCompetencies } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Competencias de la persona" }

export default async function PersonCompetenciesPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeCompetencies(user)) notFound()

  const person = await getPersonCompetencies(decodeURIComponent(codigo))
  if (!person) notFound()

  const canManage = person.canManage && !person.isSelf

  return (
    <Page>
      <Link href="/app/competencias" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Competencias
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-1">
          <h1>{person.personName}</h1>
          <p className="text-small text-texto-sec">
            {person.positionName}{person.processName ? ` · Proceso ${person.processName}` : ""}
          </p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Competencias</CardTitle>
            {canManage && person.positionId && person.competencies.length > 0 && (
              <AssessCompetencySheet membershipId={person.membershipId} positionId={person.positionId} rows={person.competencies} />
            )}
          </CardHeader>
          <CardContent>
            {person.competencies.length === 0 ? (
              <p className="text-small text-texto-sec">El cargo de esta persona no tiene perfil de competencias.</p>
            ) : (
              <PersonCompetencies rows={person.competencies} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Formación</CardTitle></CardHeader>
          <CardContent>
            <PersonTrainings items={person.trainings} canManage={canManage} membershipId={person.membershipId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={person.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
