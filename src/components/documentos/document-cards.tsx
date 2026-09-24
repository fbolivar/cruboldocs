import Link from "next/link"

import { ReviewDate } from "@/components/documentos/review-date"
import { DocumentStatusBadge } from "@/components/documentos/status-badge"
import type { DocumentSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Lista de cards para móvil (render aparte de la tabla): código + estado, título y metadatos. */
export function DocumentCards({ items }: { items: DocumentSummary[] }) {
  return (
    <ul className="divide-y divide-borde">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={`/app/documentos/${d.id}`}
            className={cn(
              "flex min-h-11 flex-col gap-1 px-4 py-3 transition-colors duration-150 active:bg-superficie-alt",
              d.status === "obsoleto" && "text-texto-sec"
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-mono text-small">{d.code}</span>
              <DocumentStatusBadge status={d.status} />
            </span>
            <span className="font-medium">{d.title}</span>
            <span className="text-small text-texto-sec">
              {d.processName} · v{d.currentVersionNo}
              {d.nextReviewDate && (
                <>
                  {" · "}
                  <ReviewDate doc={d} prefix="Revisión" />
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
