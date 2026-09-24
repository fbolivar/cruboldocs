"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IMPACT_LABELS, PROBABILITY_LABELS, RISK_LEVEL_CLASSES, RISK_LEVEL_LABELS, riskLevel } from "@/lib/domain/risk"
import { useUrlState } from "@/lib/use-url-state"
import { cn } from "@/lib/utils"

const ROWS = [5, 4, 3, 2, 1]
const COLS = [1, 2, 3, 4, 5]

function AxisLabel({ value, name, className }: { value: number; name: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("grid place-items-center text-caption text-texto-sec uppercase", className)}>{value}</span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Matriz de calor P×I 5×5. Cada celda es un botón que filtra la lista con `?celda=P-I`;
 * un segundo clic sobre la celda activa quita el filtro. `counts[p-1][i-1]`.
 */
export function RiskHeatmap({ counts, activeCell }: { counts: number[][]; activeCell?: string }) {
  const { set } = useUrlState()

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex w-4 shrink-0 justify-center pb-12" aria-hidden="true">
        <span className="-rotate-90 text-caption whitespace-nowrap text-texto-sec uppercase">
          <span className="md:hidden">Prob.</span>
          <span className="hidden md:inline">Probabilidad</span>
        </span>
      </div>
      <div className="flex flex-col gap-1" role="group" aria-label="Matriz de probabilidad por impacto">
        {ROWS.map((p) => (
          <div key={p} className="flex gap-1">
            <AxisLabel value={p} name={`Probabilidad ${p}: ${PROBABILITY_LABELS[p - 1]}`} className="w-4 md:w-7" />
            {COLS.map((i) => {
              const n = counts[p - 1]?.[i - 1] ?? 0
              const level = riskLevel(p * i)
              const key = `${p}-${i}`
              const active = activeCell === key
              const label = `Probabilidad ${p}, impacto ${i}, nivel ${RISK_LEVEL_LABELS[level].toLowerCase()}, ${n} ${n === 1 ? "riesgo" : "riesgos"}`
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      onClick={() => set({ celda: active ? null : key })}
                      className={cn(
                        "grid size-12 place-items-center rounded-sm border-2 font-display text-h3 transition-transform duration-150 hover:scale-105 md:size-16",
                        RISK_LEVEL_CLASSES[level],
                        active ? "border-texto" : "border-transparent",
                        n === 0 && !active && "opacity-25"
                      )}
                    >
                      {n > 0 ? n : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {PROBABILITY_LABELS[p - 1]} × {IMPACT_LABELS[i - 1]} · {RISK_LEVEL_LABELS[level]}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
        <div className="flex gap-1">
          <span className="w-4 md:w-7" aria-hidden="true" />
          {COLS.map((i) => (
            <AxisLabel key={i} value={i} name={`Impacto ${i}: ${IMPACT_LABELS[i - 1]}`} className="h-6 w-12 md:w-16" />
          ))}
        </div>
        <div className="flex gap-1">
          <span className="w-4 md:w-7" aria-hidden="true" />
          <span className="flex-1 text-center text-caption text-texto-sec uppercase">
            <span className="md:hidden">Imp.</span>
            <span className="hidden md:inline">Impacto</span>
          </span>
        </div>
      </div>
    </div>
  )
}
