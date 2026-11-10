"use client"

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { IndicatorStatus } from "@/lib/types"

/** Editar / archivar la ficha (Líder SIG). El envío se conecta en la fase de backend. */
export function IndicatorActions({ status }: { indicatorId: string; status: IndicatorStatus }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast.message("La edición se habilita al conectar el backend.")}
      >
        <PencilIcon /> Editar
      </Button>
      {status === "activo" ? (
        <Button size="sm" variant="outline" onClick={() => toast.success("Indicador archivado.")}>
          <ArchiveIcon /> Archivar
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => toast.success("Indicador reactivado.")}>
          <ArchiveRestoreIcon /> Reactivar
        </Button>
      )}
    </div>
  )
}
