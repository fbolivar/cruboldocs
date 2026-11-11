import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ReportBuilder } from "@/components/informes/report-builder"
import { Page, PageHeader } from "@/components/shell/page"
import { getCurrentUser } from "@/lib/data/queries"
import { canManageReports } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Nuevo informe" }

export default async function NuevoInformePage() {
  const user = await getCurrentUser()
  return (
    <Page wide>
      <Link href="/app/informes" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Informes
      </Link>
      <PageHeader title="Nuevo informe" />
      <ReportBuilder initial={null} canShare={canManageReports(user)} />
    </Page>
  )
}
