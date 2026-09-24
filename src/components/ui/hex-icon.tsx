import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Contenedor hexagonal para íconos (motivo Hex Core): estados vacíos, KPIs y avisos.
const TONES = {
  acento: { bg: "text-acento-suave", fg: "text-acento" },
  exito: { bg: "text-exito-suave", fg: "text-exito-texto" },
  error: { bg: "text-error-suave", fg: "text-error-texto" },
  advertencia: { bg: "text-advertencia-suave", fg: "text-advertencia-texto" },
  blanco: { bg: "text-superficie", fg: "text-acento" },
} as const

interface HexIconProps {
  icon: LucideIcon
  tone?: keyof typeof TONES
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = { sm: "size-9 [&>svg:last-child]:size-4", md: "size-10 [&>svg:last-child]:size-5", lg: "size-14 [&>svg:last-child]:size-6" }

export function HexIcon({ icon: Icon, tone = "acento", size = "md", className }: HexIconProps) {
  const t = TONES[tone]
  return (
    <span aria-hidden="true" className={cn("relative grid shrink-0 place-items-center", SIZES[size], t.fg, className)}>
      <svg viewBox="0 0 40 40" className={cn("absolute inset-0 size-full", t.bg)}>
        <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5z" fill="currentColor" />
      </svg>
      <Icon className="relative" strokeWidth={1.75} />
    </span>
  )
}
