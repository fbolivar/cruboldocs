import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ReportBuilder } from "@/components/informes/report-builder"
import { Page, PageHeader } from "@/components/shell/page"
import { getCurrentUser, getSavedReport } from "@/lib/data/queries"
import { canManageReports } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Informe" }

export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const report = await getSavedReport(id, user)
  if (!report) notFound()

  return (
    <Page wide>
      <Link href="/app/informes" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Informes
      </Link>
      <PageHeader title={report.name} />
      <ReportBuilder initial={report} canShare={canManageReports(user)} />
    </Page>
  )
}
