"use client"

import { EllipsisIcon } from "lucide-react"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/** Botón "⋯" de acciones de fila; el nombre accesible incluye el objeto. */
export function RowMenuTrigger({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={label} {...props}>
        <EllipsisIcon className="size-5" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
  )
}

/** Clase para ítems de menú con área táctil de 44px en móvil. */
export const MENU_ITEM_CLASS = "min-h-11 px-3 text-body md:min-h-8 md:px-2"
