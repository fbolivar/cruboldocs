"use client"

import { DownloadIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react"

import { RegisterDocumentSheet, type RegisterCatalogs } from "@/components/documentos/register-document-sheet"
import { useExportCsv } from "@/components/documentos/use-export-csv"
import { useRegisterDrawer } from "@/components/documentos/use-register-drawer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Acciones del encabezado. Escritorio: "Exportar CSV" + "Registrar documento".
 * Móvil: "Exportar" en menú ⋯ y "Registrar" como botón flotante sobre la barra inferior.
 * `catalogs` es null si el usuario no puede registrar documentos.
 */
export function DocumentsHeaderActions({ catalogs }: { catalogs: RegisterCatalogs | null }) {
  const { exportCsv, exporting } = useExportCsv()
  const { open, setOpen } = useRegisterDrawer()

  return (
    <>
      <div className="hidden items-center gap-3 md:flex">
        <Button variant="outline" onClick={exportCsv} loading={exporting}>
          {!exporting && <DownloadIcon aria-hidden="true" />}
          Exportar CSV
        </Button>
        {catalogs && (
          <Button onClick={() => setOpen(true)}>
            <PlusIcon aria-hidden="true" />
            Registrar documento
          </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Más acciones">
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="min-h-11 text-body" disabled={exporting} onSelect={exportCsv}>
            <DownloadIcon aria-hidden="true" />
            Exportar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {catalogs && (
        <>
          <Button
            onClick={() => setOpen(true)}
            className="fixed right-4 bottom-20 z-30 h-12 shadow-lg md:hidden"
          >
            <PlusIcon aria-hidden="true" />
            Registrar
          </Button>
          <RegisterDocumentSheet open={open} onOpenChange={setOpen} catalogs={catalogs} />
        </>
      )}
    </>
  )
}
