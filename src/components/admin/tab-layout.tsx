import type * as React from "react"

import { Card } from "@/components/ui/card"
import { SectionError } from "@/components/ui/section-error"
import { TAB_ERROR_TITLE } from "@/components/admin/labels"
import { cn } from "@/lib/utils"

/** Barra superior de la pestaña: filtros a la izquierda, acción primaria a la derecha. */
export function TabToolbar({ children, action }: { children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      {children && <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>}
      {action && <div className="flex md:ml-auto">{action}</div>}
    </div>
  )
}

/** Tabla en escritorio + lista de cards en móvil dentro de una misma card. */
export function DataCard({ table, cards, className }: { table: React.ReactNode; cards: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="hidden md:block">{table}</div>
      <ul className="divide-y divide-borde md:hidden">{cards}</ul>
    </Card>
  )
}

/** Error de la pestaña activa: el resto de la pantalla sigue visible. */
export function TabError() {
  return <SectionError title={TAB_ERROR_TITLE} />
}

/** Resumen de conteo accesible sobre la tabla. */
export function ResultCount({ count, singular, plural }: { count: number; singular: string; plural: string }) {
  return (
    <p className="text-small text-texto-sec" aria-live="polite">
      {count} {count === 1 ? singular : plural}
    </p>
  )
}
