"use client"

import type * as React from "react"

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Modal de la ficha: 480px, radio lg, sombra lg en escritorio; hoja a pantalla
 * completa en móvil (spec §3). Radix atrapa el foco y lo devuelve al cerrar.
 */
export function FichaDialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <DialogContent
      className={cn(
        "top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto rounded-none bg-superficie p-4 text-body text-texto shadow-lg ring-0 sm:max-w-none",
        "md:top-1/2 md:left-1/2 md:h-auto md:max-h-dvh md:max-w-120 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-6",
        className
      )}
    >
      <DialogHeader className="pr-10">
        <DialogTitle className="font-display text-h2 leading-7">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-small text-texto-sec">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
      </DialogHeader>
      {children}
    </DialogContent>
  )
}

/** Pie del modal: en móvil botones a lo ancho con la primaria arriba y al fondo de la hoja. */
export function FichaDialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col-reverse gap-2 pt-2 md:mt-0 md:flex-row md:justify-end *:w-full md:*:w-auto">
      {children}
    </div>
  )
}
