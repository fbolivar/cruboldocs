"use client"

import type * as React from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface FormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel: string
  pending: boolean
  onSubmit: () => void
  children: React.ReactNode
}

/** Drawer lateral con formulario: encabezado, campos con scroll y pie con Cancelar + acción primaria. */
export function FormSheet({ open, onOpenChange, title, description, submitLabel, pending, onSubmit, children }: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <SheetContent size="sm" className="gap-0">
        <form
          noValidate
          className="flex h-full flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <SheetHeader className="border-b border-borde px-4 py-4 pr-12 md:px-6">
            <SheetTitle className="font-display text-h3">{title}</SheetTitle>
            {description && <SheetDescription className="text-small text-texto-sec">{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 md:px-6">{children}</div>
          <SheetFooter className="flex-row justify-end gap-3 border-t border-borde px-4 py-4 md:px-6">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
