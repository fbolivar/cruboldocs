import { ChevronLeftIcon, FileQuestionIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { SubmissionForm } from "@/components/formularios/field-renderer"
import { Page } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getPublishedFormByCode } from "@/lib/data/queries"
import { canFillForms } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Diligenciar formulario" }

export default async function ResponderPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canFillForms(user)) notFound()

  const form = await getPublishedFormByCode(decodeURIComponent(codigo))

  return (
    <Page>
      <Link href={`/app/formularios/${decodeURIComponent(codigo)}`} className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Formularios
      </Link>
      {!form ? (
        <EmptyState icon={FileQuestionIcon} title="Este formulario no está disponible para diligenciar" description="Puede estar en borrador o archivado. Consulta con quien lo gestiona." />
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h1>{form.title}</h1>
            <p className="mt-0.5 text-small text-texto-sec">{form.code} · v{form.version}</p>
          </div>
          <SubmissionForm form={form} />
        </div>
      )}
    </Page>
  )
}
