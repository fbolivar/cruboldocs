import { RISK_LEVEL_CLASSES, RISK_LEVEL_LABELS } from "@/lib/domain/risk"
import type { RiskLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Nivel de riesgo: color + nombre + puntaje (el color nunca va solo). */
export function RiskLevelBadge({ level, score, className }: { level: RiskLevel; score?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm px-2 text-caption font-medium tracking-normal whitespace-nowrap",
        RISK_LEVEL_CLASSES[level],
        className
      )}
    >
      {RISK_LEVEL_LABELS[level]}
      {score !== undefined && ` ${score}`}
    </span>
  )
}

/** Muestra cuadrada del color del nivel (leyendas). */
export function RiskSwatch({ level }: { level: RiskLevel }) {
  return <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-sm", RISK_LEVEL_CLASSES[level])} />
}
