import { TriangleAlertIcon } from "lucide-react"

import { formatDate } from "@/lib/format"
import type { DocumentSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Próxima revisión: fecha; si está vencida, ícono ⚠ + texto error (nunca solo color). */
export function ReviewDate({ doc, prefix, className }: { doc: DocumentSummary; prefix?: string; className?: string }) {
  if (!doc.nextReviewDate) {
    return prefix ? null : (
      <span className={cn("text-texto-sec", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sin fecha de revisión</span>
      </span>
    )
  }
  const date = formatDate(doc.nextReviewDate)
  if (!doc.reviewOverdue) return <span className={className}>{prefix ? `${prefix} ${date}` : date}</span>
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-error-texto", className)}>
      <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {prefix ? `${prefix} vencida ${date}` : <><span className="sr-only">Revisión vencida: </span>{date}</>}
      </span>
    </span>
  )
}
