import { ArchiveIcon, PenLineIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DOCUMENT_STATUS_META, VERSION_STATUS_META } from "@/lib/domain/documents"
import type { DocumentStatus, VersionStatus } from "@/lib/types"

/** Mapa fijo de estados de tokens.md. En aprobación lleva ícono de firma; obsoleto, de archivo. */
export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const meta = DOCUMENT_STATUS_META[status]
  const icon =
    status === "en_aprobacion" ? <PenLineIcon aria-hidden="true" /> : status === "obsoleto" ? <ArchiveIcon aria-hidden="true" /> : undefined
  return (
    <Badge tone={meta.tone} icon={icon}>
      {meta.label}
    </Badge>
  )
}

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const meta = VERSION_STATUS_META[status]
  const icon = status === "reemplazada" ? <ArchiveIcon aria-hidden="true" /> : undefined
  return (
    <Badge tone={meta.tone} icon={icon}>
      {meta.label}
    </Badge>
  )
}
