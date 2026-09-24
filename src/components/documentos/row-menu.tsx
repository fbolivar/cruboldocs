"use client"

import { ExternalLinkIcon, LinkIcon, MessageSquarePlusIcon, MoreHorizontalIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DocumentSummary } from "@/lib/types"

/** Menú "⋯" de una fila: Abrir, Copiar enlace y Solicitar actualización (solo vigentes). Sin acciones destructivas. */
export function RowMenu({ doc }: { doc: DocumentSummary }) {
  const router = useRouter()
  const href = `/app/documentos/${doc.id}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      toast.success(`Enlace de ${doc.code} copiado.`)
    } catch {
      toast.error("No pudimos copiar el enlace. Ábrelo y cópialo desde la barra del navegador.")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${doc.code}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      {/* Los eventos de React cruzan el portal: se detienen para no activar el clic de la fila. */}
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild className="min-h-9 text-body">
          <Link href={href}>
            <ExternalLinkIcon aria-hidden="true" />
            Abrir
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-9 text-body" onSelect={copyLink}>
          <LinkIcon aria-hidden="true" />
          Copiar enlace
        </DropdownMenuItem>
        {doc.status === "vigente" && (
          <DropdownMenuItem className="min-h-9 text-body" onSelect={() => router.push(`${href}?accion=solicitar`)}>
            <MessageSquarePlusIcon aria-hidden="true" />
            Solicitar actualización
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
