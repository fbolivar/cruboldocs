import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PositionProfile } from "@/components/competencias/position-profile"
import { Page } from "@/components/shell/page"
import { getCurrentUser, getPositionProfile, listCompetencyCatalog } from "@/lib/data/queries"
import { canManageCompetencies, canSeeCompetencies } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Perfil del cargo" }

export default async function PositionProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!canSeeCompetencies(user)) notFound()
  const profile = await getPositionProfile(id)
  if (!profile) notFound()
  const catalog = await listCompetencyCatalog()

  return (
    <Page>
      <Link href="/app/competencias" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Competencias
      </Link>
      <div className="flex flex-col gap-1">
        <h1>{profile.positionName}</h1>
        {profile.processName && <p className="text-small text-texto-sec">Proceso {profile.processName} · Perfil de competencias</p>}
      </div>
      <PositionProfile profile={profile} catalog={catalog} canManage={canManageCompetencies(user)} />
    </Page>
  )
}
