"use client"

import {
  CheckCheckIcon,
  ClipboardListIcon,
  FilePlusIcon,
  type LucideIcon,
  MessageSquarePlusIcon,
  PenLineIcon,
  SendIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { HexIcon } from "@/components/ui/hex-icon"
import type { ActionBarModel, DocumentActionId } from "@/lib/domain/documents"
import { cn } from "@/lib/utils"

const ICONS: Partial<Record<DocumentActionId, LucideIcon>> = {
  enviar_revision: SendIcon,
  firmar_revision: PenLineIcon,
  firmar_aprobacion: PenLineIcon,
  confirmar_lectura: CheckCheckIcon,
  solicitar_actualizacion: MessageSquarePlusIcon,
  crear_version: FilePlusIcon,
}

interface ActionBarProps {
  model: ActionBarModel
  /** Línea secundaria: vencimiento de la tarea y contexto (p. ej. quién revisó). */
  detail: string | null
  pending: DocumentActionId | null
  /** Confirmar lectura se habilita solo después de abrir el visor. */
  viewerOpened: boolean
  onAction: (id: DocumentActionId) => void
}

/** Barra de acción: una sola primaria. Acento suave si es una tarea asignada; superficie si es solo disponible. */
export function ActionBar({ model, detail, pending, viewerOpened, onAction }: ActionBarProps) {
  const isTask = model.taskMessage !== null
  const { primary } = model
  const PrimaryIcon = ICONS[primary.id]
  const blocked = primary.id === "confirmar_lectura" && !viewerOpened
  const hintId = "barra-accion-ayuda"
  const hint = blocked
    ? "Abre el documento en el visor para habilitar la confirmación de lectura."
    : (detail ?? (isTask ? null : "Solicita su actualización al elaborador; queda registrada en el historial."))

  return (
    <section
      aria-label="Acciones del documento"
      className={cn(
        "flex flex-col gap-4 rounded-md border px-4 py-4 md:flex-row md:items-center md:px-5",
        isTask ? "border-acento/20 bg-acento-suave" : "border-borde bg-superficie"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <HexIcon icon={isTask ? ClipboardListIcon : MessageSquarePlusIcon} tone={isTask ? "blanco" : "acento"} size="sm" />
        <div className="min-w-0">
          <p className="font-semibold">
            {model.taskMessage ?? "¿Este documento necesita cambios?"}
          </p>
          {hint && (
            <p id={hintId} className="text-small text-texto-sec">
              {hint}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
        {model.secondary.map((a) => (
          <Button
            key={a.id}
            variant="outline"
            className="w-full md:w-auto"
            loading={pending === a.id}
            disabled={pending !== null}
            onClick={() => onAction(a.id)}
          >
            {a.label}
          </Button>
        ))}
        <Button
          variant={isTask ? "default" : "outline"}
          className="w-full md:w-auto"
          loading={pending === primary.id}
          disabled={blocked || (pending !== null && pending !== primary.id)}
          aria-describedby={blocked ? hintId : undefined}
          onClick={() => onAction(primary.id)}
        >
          {PrimaryIcon && pending !== primary.id && <PrimaryIcon aria-hidden="true" />}
          {primary.label}
        </Button>
      </div>
    </section>
  )
}
