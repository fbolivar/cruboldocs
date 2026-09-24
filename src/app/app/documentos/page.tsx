import type { Metadata } from "next"
import { Suspense } from "react"

import { DocumentFilters } from "@/components/documentos/document-filters"
import { DocumentsHeaderActions } from "@/components/documentos/documents-header-actions"
import { DocumentsResults } from "@/components/documentos/documents-results"
import { DocumentTableSkeleton } from "@/components/documentos/documents-skeleton"
import { parseDocumentFilters } from "@/components/documentos/filter-params"
import { ProcessMap } from "@/components/documentos/process-map"
import type { RegisterCatalogs } from "@/components/documentos/use-register-form"
import { Page, PageHeader } from "@/components/shell/page"
import { Card } from "@/components/ui/card"
import { getCurrentUser, listAllDocuments, listDocumentTypes, listPositions, listProcesses } from "@/lib/data/queries"
import { canRegisterDocuments } from "@/lib/domain/documents"
import type { SearchParams } from "@/lib/url"

export const metadata: Metadata = { title: "Documentos" }

/** Catálogo que falla → null: la sección que lo usa degrada sin tumbar la página. */
const orNull = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null)

export default async function DocumentosPage({ searchParams }: PageProps<"/app/documentos">) {
  // `registrar` es estado de UI del panel (se lee en el cliente); no viaja en los enlaces de orden/página.
  const { registrar: _registrar, ...sp }: SearchParams = await searchParams
  const filters = parseDocumentFilters(sp)
  const user = await getCurrentUser()
  const canRegister = canRegisterDocuments(user)

  const [processes, types, positions, allDocs] = await Promise.all([
    orNull(listProcesses()),
    orNull(listDocumentTypes()),
    canRegister ? orNull(listPositions()) : null,
    canRegister ? orNull(listAllDocuments({})) : null,
  ])

  const catalogs: RegisterCatalogs | null = canRegister
    ? {
        processes: processes ?? [],
        types: types ?? [],
        positions: positions ?? [],
        existingCodes: (allDocs ?? []).map((d) => d.code),
        defaultElaboradorId: user.positionId,
      }
    : null

  return (
    <Page wide>
      <PageHeader title="Documentos" actions={<DocumentsHeaderActions catalogs={catalogs} />} />

      {processes ? (
        processes.length > 0 && <ProcessMap processes={processes} />
      ) : (
        <Card className="px-4 py-3 text-small text-texto-sec md:px-6" role="status">
          No pudimos cargar el mapa de procesos. La lista maestra sigue disponible.
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <DocumentFilters processes={processes ?? []} types={types ?? []} />
        <Suspense fallback={<DocumentTableSkeleton />}>
          <DocumentsResults filters={filters} sp={sp} canRegister={canRegister} />
        </Suspense>
      </div>
    </Page>
  )
}
