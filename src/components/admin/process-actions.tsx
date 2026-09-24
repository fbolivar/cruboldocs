"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { Option } from "@/components/admin/option-select"
import { ProcessSheet } from "@/components/admin/process-sheet"
import { MENU_ITEM_CLASS, RowMenuTrigger } from "@/components/admin/row-menu-trigger"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteProcess } from "@/lib/data/actions"
import type { Process } from "@/lib/types"

interface ProcessActionsProps {
  process: Process
  positions: Option[]
  /** Móvil: menú "⋯" en lugar de botones con tooltip. */
  compact?: boolean
}

export function ProcessActions({ process, positions, compact = false }: ProcessActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const hasDocs = process.documentCount > 0
  const blockedReason = `No se puede eliminar: tiene ${process.documentCount} ${process.documentCount === 1 ? "documento" : "documentos"}. Reasígnalos u obsolétalos primero.`

  function remove() {
    startTransition(async () => {
      const res = await deleteProcess(process.id)
      if (!res.ok) return void toast.error(res.error)
      toast.success(`Proceso ${process.name} eliminado`)
      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <>
      {compact ? (
        <DropdownMenu>
          <RowMenuTrigger label={`Acciones para ${process.name}`} />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => setEditing(true)}>
              <PencilIcon aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={hasDocs} className={MENU_ITEM_CLASS} onSelect={() => setConfirming(true)}>
              <Trash2Icon aria-hidden="true" />
              <span className="flex flex-col">
                Eliminar
                {hasDocs && <span className="text-small text-texto-sec">{blockedReason}</span>}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="inline-flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Editar ${process.name}`} onClick={() => setEditing(true)}>
            <PencilIcon aria-hidden="true" />
          </Button>
          {hasDocs ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* El botón deshabilitado no recibe foco ni hover: el span lleva el tooltip. */}
                <span tabIndex={0} aria-label={`Eliminar ${process.name}. ${blockedReason}`} className="inline-flex rounded-md">
                  <Button variant="ghost" size="icon" disabled aria-hidden="true" tabIndex={-1}>
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{blockedReason}</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon" aria-label={`Eliminar ${process.name}`} onClick={() => setConfirming(true)}>
              <Trash2Icon aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      <ProcessSheet process={process} positions={positions} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Eliminar el proceso ${process.name}?`}
        description="Se quita del mapa de procesos. Los cargos asociados quedan sin proceso."
        confirmLabel="Eliminar proceso"
        pending={pending}
        onConfirm={remove}
      />
    </>
  )
}
