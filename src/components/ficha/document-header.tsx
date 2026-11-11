import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { DocumentStatusBadge } from "@/components/documentos/status-badge"
import { UntranslatedChip } from "@/components/i18n/untranslated-chip"
import { Badge, Chip } from "@/components/ui/badge"
import type { DocumentDetail, DocumentVersion } from "@/lib/types"

interface DocumentHeaderProps {
  doc: DocumentDetail
  version: DocumentVersion
  /** Versión vigente a la que lleva el banner cuando se ve una reemplazada. */
  currentHref: string | null
}

/** Código mono + estado + versión, h1 con el título y banner si la versión está reemplazada. */
export function DocumentHeader({ doc, version, currentHref }: DocumentHeaderProps) {
  const superseded = version.status === "reemplazada"
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-small text-texto-sec">{doc.code}</span>
          <DocumentStatusBadge status={doc.status} />
          {doc.reviewOverdue && <Badge tone="error">Revisión vencida</Badge>}
          <Chip className="font-mono">v{version.versionNo}</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1>{doc.localizedTitle}</h1>
          {doc.titleFallback && <UntranslatedChip />}
        </div>
      </div>
      {superseded && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-advertencia-suave px-4 py-3 text-small text-advertencia-texto"
        >
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          <p className="font-medium">Estás viendo la versión {version.versionNo} (reemplazada).</p>
          {currentHref && (
            <Link href={currentHref} className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4 md:min-h-0">
              Ver versión vigente
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
