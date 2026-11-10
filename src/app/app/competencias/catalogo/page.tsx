import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CatalogTable } from "@/components/competencias/catalog-table"
import { Page, PageHeader } from "@/components/shell/page"
import { getCurrentUser, listCompetencyCatalog } from "@/lib/data/queries"
import { canManageCompetencies, canSeeCompetencies } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Catálogo de competencias" }

export default async function CatalogoPage() {
  const user = await getCurrentUser()
  if (!canSeeCompetencies(user)) notFound()
  const items = await listCompetencyCatalog()

  return (
    <Page>
      <Link href="/app/competencias" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Competencias
      </Link>
      <PageHeader title="Catálogo de competencias" />
      <CatalogTable items={items} canManage={canManageCompetencies(user)} />
    </Page>
  )
}
