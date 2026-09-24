import { FileTextIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"

import { DocumentCards } from "@/components/documentos/document-cards"
import { DocumentTable } from "@/components/documentos/document-table"
import { activeFilterCount, CLEAR_FILTERS } from "@/components/documentos/filter-params"
import { RegisterButton } from "@/components/documentos/register-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { SectionError } from "@/components/ui/section-error"
import { listDocuments } from "@/lib/data/queries"
import { withParams, type SearchParams } from "@/lib/url"
import type { DocumentFilters, DocumentSummary, Paginated } from "@/lib/types"

const PATH = "/app/documentos"

/** Tabla (escritorio) / cards (móvil) + paginación. Si falla, solo esta sección degrada. */
export async function DocumentsResults({
  filters,
  sp,
  canRegister,
}: {
  filters: DocumentFilters
  sp: SearchParams
  canRegister: boolean
}) {
  let result: Paginated<DocumentSummary>
  try {
    result = await listDocuments(filters)
  } catch {
    return <SectionError title="No pudimos cargar la lista maestra." />
  }

  if (result.total === 0) {
    const filtered = activeFilterCount(filters) > 0
    return (
      <Card>
        {filtered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ningún documento coincide con estos filtros."
            action={
              <Button variant="outline" asChild>
                <Link href={withParams(PATH, sp, { ...CLEAR_FILTERS, page: null })} scroll={false}>
                  Limpiar filtros
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileTextIcon}
            title="Aún no hay documentos registrados."
            description={canRegister ? undefined : "Cuando se aprueben documentos, aparecerán aquí."}
            action={canRegister ? <RegisterButton /> : undefined}
          />
        )}
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="hidden md:block">
        <DocumentTable items={result.items} filters={filters} sp={sp} />
      </div>
      <div className="md:hidden">
        <DocumentCards items={result.items} />
      </div>
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        hrefFor={(p) => withParams(PATH, sp, { page: p === 1 ? null : p })}
      />
    </Card>
  )
}
