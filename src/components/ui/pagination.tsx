import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  /** Construye el href de una página conservando los filtros actuales. */
  hrefFor: (page: number) => string
}

/** Pie de tabla: "1–25 de 104" + páginas. Server component: navega por URL. */
export function Pagination({ page, pageSize, total, hrefFor }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const item = "grid size-11 place-items-center rounded-sm text-small md:size-8"
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 border-t border-borde px-4 py-2 text-small text-texto-sec">
      <span>
        {from}–{to} de {total}
      </span>
      {pages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} className={cn(item, "hover:bg-superficie-alt")} aria-label="Página anterior">
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className={cn(item, "opacity-40")} aria-hidden="true">
                <ChevronLeftIcon className="size-4" />
              </span>
            )}
          </li>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(item, p === page ? "bg-acento-suave font-semibold text-acento" : "hover:bg-superficie-alt")}
              >
                {p}
              </Link>
            </li>
          ))}
          <li>
            {page < pages ? (
              <Link href={hrefFor(page + 1)} className={cn(item, "hover:bg-superficie-alt")} aria-label="Página siguiente">
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className={cn(item, "opacity-40")} aria-hidden="true">
                <ChevronRightIcon className="size-4" />
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  )
}
