import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { HexIcon } from "@/components/ui/hex-icon"
import { cn } from "@/lib/utils"

interface SummaryCardProps {
  icon: LucideIcon
  value: number
  label: string
  href: string
  /** Cifra en `error-texto` (p. ej. vencidas > 0). */
  alert?: boolean
}

/** Cifra de resumen clicable: filtra la bandeja o lleva a la pantalla correspondiente. */
export function SummaryCard({ icon, value, label, href, alert = false }: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-start gap-3 rounded-md border border-borde bg-superficie p-4 transition-colors duration-150 ease-out hover:border-acento md:items-center"
    >
      <HexIcon icon={icon} tone={alert ? "error" : "acento"} className="hidden md:grid" />
      <span className="flex min-w-0 flex-col">
        <span className={cn("font-display text-h1-movil tabular-nums md:text-kpi", alert && "text-error-texto")}>{value}</span>
        <span className="text-small text-texto-sec">{label}</span>
      </span>
    </Link>
  )
}
