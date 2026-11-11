import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ReportsList } from "@/components/informes/reports-list"
import { Page, PageHeader } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { getCurrentUser, listSavedReports } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Informes" }

export default async function InformesPage() {
  const user = await getCurrentUser()
  const reports = await listSavedReports(user)

  return (
    <Page wide>
      <PageHeader
        title="Informes"
        actions={<Button asChild><Link href="/app/informes/nuevo"><PlusIcon /> Nuevo informe</Link></Button>}
      />
      <ReportsList reports={reports} />
    </Page>
  )
}
