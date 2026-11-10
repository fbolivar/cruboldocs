import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { TrainingList } from "@/components/competencias/training-list"
import { Page, PageHeader } from "@/components/shell/page"
import { listTrainings } from "@/lib/data/competencias-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canManageCompetencies, canSeeCompetencies } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Formación" }

export default async function FormacionPage() {
  const user = await getCurrentUser()
  if (!canSeeCompetencies(user)) notFound()
  const items = await listTrainings()

  return (
    <Page>
      <Link href="/app/competencias" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Competencias
      </Link>
      <PageHeader title="Formación" />
      <TrainingList items={items} canManage={canManageCompetencies(user)} />
    </Page>
  )
}
