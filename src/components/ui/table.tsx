import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"
import Link from "next/link"
import type * as React from "react"

import { cn } from "@/lib/utils"

// Tabla semántica de escritorio. En móvil las pantallas renderizan una lista de cards aparte.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", className)} {...props} />
    </div>
  )
}

function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-superficie-alt", className)} {...props} />
}

function Th({ className, ...props }: React.ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-2.5 text-label whitespace-nowrap text-texto-sec", className)} {...props} />
}

/** Encabezado ordenable: enlace que cambia `sort`/`dir` en la URL, con aria-sort. */
function SortableTh({
  label,
  active,
  dir,
  href,
  className,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  href: string
  className?: string
}) {
  const Icon = !active ? ArrowUpDownIcon : dir === "asc" ? ArrowUpIcon : ArrowDownIcon
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-2.5 text-label whitespace-nowrap text-texto-sec", className)}
    >
      <Link href={href} scroll={false} className="inline-flex items-center gap-1 hover:text-texto">
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden="true" />
      </Link>
    </th>
  )
}

function Tr({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-t border-borde transition-colors duration-150", className)} {...props} />
}

function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />
}

export { SortableTh, Table, Td, Th, THead, Tr }
