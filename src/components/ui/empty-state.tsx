import type { LucideIcon } from "lucide-react"
import type * as React from "react"

import { HexIcon } from "@/components/ui/hex-icon"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  tone?: "acento" | "exito"
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Estado vacío: ícono en hexágono + mensaje de una línea + acción sugerida. */
export function EmptyState({ icon, tone = "acento", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <HexIcon icon={icon} tone={tone} size="lg" />
      <p className="max-w-md font-medium">{title}</p>
      {description && <p className="max-w-md text-small text-texto-sec">{description}</p>}
      {action}
    </div>
  )
}
