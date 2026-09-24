import { RiskSwatch } from "@/components/riesgos/risk-level-badge"
import { Card } from "@/components/ui/card"
import { RISK_LEVEL_LABELS, RISK_LEVELS } from "@/lib/domain/risk"
import type { RiskMatrix } from "@/lib/types"

/** Resumen de la matriz: card lateral de 280px en escritorio, fila de 4 chips en móvil. */
export function RiskSummary({ matrix }: { matrix: RiskMatrix }) {
  const kindLabel = matrix.kind === "inherente" ? "inherente" : "residual"
  return (
    <Card className="flex flex-col gap-4 p-4 md:w-70 md:shrink-0 md:p-6">
      <div className="flex items-baseline justify-between gap-3 md:block">
        <div className="flex items-baseline gap-2 md:block">
          <p className="font-display text-kpi">{matrix.total}</p>
          <p className="text-small text-texto-sec">{matrix.total === 1 ? "riesgo identificado" : "riesgos identificados"}</p>
        </div>
        <p className="text-small text-texto-sec md:hidden">
          <span className="font-semibold text-exito-texto">{matrix.total ? `${matrix.controlsOnTimePct} %` : "—"}</span> controles a tiempo
        </p>
      </div>

      <ul aria-label={`Riesgos por nivel (valoración ${kindLabel})`} className="grid grid-cols-4 gap-2 md:flex md:flex-col md:gap-3">
        {RISK_LEVELS.map((level) => (
          <li
            key={level}
            className="flex flex-col items-center gap-1 rounded-sm bg-superficie-alt px-2 py-2 md:flex-row md:justify-between md:bg-transparent md:p-0"
          >
            <span className="flex items-center gap-2 text-small md:text-body">
              <RiskSwatch level={level} />
              {RISK_LEVEL_LABELS[level]}
            </span>
            <span className="font-semibold">{matrix.byLevel[level]}</span>
          </li>
        ))}
      </ul>

      <div className="hidden border-t border-borde pt-4 md:block">
        <p className="font-display text-h2 text-exito-texto">{matrix.total ? `${matrix.controlsOnTimePct} %` : "—"}</p>
        <p className="text-small text-texto-sec">controles con evidencia a tiempo</p>
      </div>
    </Card>
  )
}
