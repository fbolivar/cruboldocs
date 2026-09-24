"use client"

import { DownloadIcon, ExpandIcon, Loader2Icon, LockIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HexIcon } from "@/components/ui/hex-icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { DocumentVersion } from "@/lib/types"

type Status = "comprobando" | "listo" | "error"

interface PdfViewerProps {
  code: string
  version: DocumentVersion
  /** Se llama cuando el PDF se cargó o se abrió/descargó (habilita confirmar lectura). */
  onOpened: () => void
}

// Alto: min(100dvh, 512px) en móvil y min(100dvh, 800px) en escritorio (≈60vh / 75vh sin valores arbitrarios).
const FRAME_HEIGHT = "h-dvh max-h-128 md:max-h-200"

/** Visor nativo del navegador (iframe). Paginación y zoom los da el propio navegador. Montar con `key` por versión. */
export function PdfViewer({ code, version, onOpened }: PdfViewerProps) {
  const url = version.pdfUrl
  const [status, setStatus] = useState<Status>("comprobando")
  const [loaded, setLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!url) return
    let alive = true
    fetch(url, { method: "HEAD", cache: "no-store" })
      .then((r) => alive && setStatus(r.ok ? "listo" : "error"))
      .catch(() => alive && setStatus("error"))
    return () => {
      alive = false
    }
  }, [url, attempt])

  if (!url) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <HexIcon icon={LockIcon} size="lg" />
        <p className="max-w-sm font-medium">Tu rol de administrador permite ver los datos del documento, pero no su contenido.</p>
      </Card>
    )
  }

  function retry() {
    setStatus("comprobando")
    setLoaded(false)
    setAttempt((a) => a + 1)
  }

  const ext = version.sourceFileName.split(".").pop() ?? "docx"
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-borde px-3 py-2">
        <p className="min-w-0 flex-1 truncate font-mono text-small text-texto-sec">
          <span className="hidden md:inline">{code} · </span>v{version.versionNo}
        </p>
        <Button variant="ghost" size="sm" asChild>
          <a href={url} download onClick={onOpened}>
            <DownloadIcon aria-hidden="true" />
            PDF
          </a>
        </Button>
        {version.sourceUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={version.sourceUrl} download={version.sourceFileName}>
              <DownloadIcon aria-hidden="true" />
              Fuente (.{ext})
            </a>
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="hidden md:inline-flex" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir en pantalla completa" onClick={onOpened}>
                <ExpandIcon aria-hidden="true" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir en pantalla completa</TooltipContent>
        </Tooltip>
      </div>

      <div className={`relative bg-superficie-alt ${FRAME_HEIGHT}`}>
        {status === "error" ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <HexIcon icon={TriangleAlertIcon} tone="error" size="lg" />
            <p className="font-medium">No pudimos mostrar el PDF.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={retry}>
                Reintentar
              </Button>
              <Button variant="outline" asChild>
                <a href={url} download>
                  <DownloadIcon aria-hidden="true" />
                  Descargar PDF
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* El indicador queda detrás del iframe: el visor del navegador lo cubre al pintar el PDF. */}
            {!loaded && (
              <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-small text-texto-sec">
                <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Cargando PDF…
              </div>
            )}
            {status === "listo" && (
              <iframe
                key={attempt}
                src={url}
                title={`${code} versión ${version.versionNo} (PDF)`}
                className="relative size-full border-0"
                onLoad={() => {
                  setLoaded(true)
                  onOpened()
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="border-t border-borde p-3 md:hidden">
        <Button variant="outline" className="w-full" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={onOpened}>
            <ExpandIcon aria-hidden="true" />
            Abrir en pantalla completa
          </a>
        </Button>
      </div>
    </Card>
  )
}
