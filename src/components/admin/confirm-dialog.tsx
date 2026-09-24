"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pregunta que nombra el objeto afectado. */
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  onConfirm: () => void
}

/** Confirmación de acción destructiva; el botón espera la respuesta del servidor con spinner. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, pending, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <AlertDialogContent className="p-6 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-h3">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-body text-texto-sec">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-lg border-borde bg-superficie-alt px-6 py-4">
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
