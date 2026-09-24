import type * as React from "react"

import { cn } from "@/lib/utils"

/** Contenedor de pantalla: gutter 16/32, secciones separadas 16/32, máx. 1280px (full-width en tablas densas). */
export function Page({ children, wide = false, className }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-4 px-4 py-4 md:gap-8 md:px-8 md:py-8", !wide && "max-w-7xl", className)}>
      {children}
    </div>
  )
}

/** h1 único de la vista + descripción opcional + acciones a la derecha. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow}
        <h1>{title}</h1>
        {description && <p className="text-texto-sec">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
