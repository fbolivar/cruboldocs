import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormStatusBadge } from "@/components/formularios/badges"
import { FormDesigner } from "@/components/formularios/designer"
import { Page } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { LockIcon } from "lucide-react"
import { getCurrentUser, getFormTemplate, listProcesses } from "@/lib/data/queries"
import { canSeeForms } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Diseñar formulario" }

export default async function DisenarPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeForms(user)) notFound()

  const t = await getFormTemplate(decodeURIComponent(codigo))
  if (!t) notFound()

  const processes = t.canManage ? await listProcesses() : []
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <Link href={`/app/formularios/${t.code}`} className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> {t.code}
      </Link>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1>{t.title}</h1>
          <FormStatusBadge status={t.status} version={t.hasOpenDraft ? t.draftVersion : t.publishedVersion ?? t.draftVersion} />
        </div>
        {!t.canManage ? (
          <EmptyState icon={LockIcon} title="Solo lectura" description="No gestionas esta plantilla; puedes verla desde su ficha." />
        ) : (
          <FormDesigner template={t} processes={processOptions} />
        )}
      </div>
    </Page>
  )
}
