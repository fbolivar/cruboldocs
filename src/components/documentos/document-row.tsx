"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ReviewDate } from "@/components/documentos/review-date"
import { RowMenu } from "@/components/documentos/row-menu"
import { DocumentStatusBadge } from "@/components/documentos/status-badge"
import { Td, Tr } from "@/components/ui/table"
import type { DocumentSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Fila clicable → ficha. El código es además un enlace real (teclado, abrir en otra pestaña). */
export function DocumentRow({ doc }: { doc: DocumentSummary }) {
  const router = useRouter()
  const href = `/app/documentos/${doc.id}`
  const dim = doc.status === "obsoleto"

  return (
    <Tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return
        router.push(href)
      }}
      className={cn("cursor-pointer hover:bg-superficie-alt", dim && "text-texto-sec")}
    >
      <Td className="font-mono text-small whitespace-nowrap">
        <Link href={href} className="hover:text-acento hover:underline">
          {doc.code}
        </Link>
      </Td>
      <Td className={cn("min-w-60", !dim && "text-texto")}>{doc.title}</Td>
      <Td className="whitespace-nowrap">{doc.processName}</Td>
      <Td className="font-mono text-small">v{doc.currentVersionNo}</Td>
      <Td>
        <DocumentStatusBadge status={doc.status} />
      </Td>
      <Td className="whitespace-nowrap">
        <ReviewDate doc={doc} />
      </Td>
      <Td className="w-12 py-1 pr-2 text-right">
        <RowMenu doc={doc} />
      </Td>
    </Tr>
  )
}
