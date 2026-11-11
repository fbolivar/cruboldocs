"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

/** Campo de solo lectura con el enlace y un botón Copiar (portapapeles del navegador). */
export function CopyLinkField({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // El usuario puede seleccionar y copiar manualmente.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Enlace público"
        className="h-9 flex-1 rounded-md border border-borde bg-fondo px-3 text-small text-texto-sec"
      />
      <Button variant="outline" size="sm" onClick={copy} aria-label="Copiar enlace">
        {copied ? <CheckIcon className="text-exito-texto" /> : <CopyIcon />}
      </Button>
    </div>
  )
}
