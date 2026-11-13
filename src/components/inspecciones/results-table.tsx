import { CriterionDot } from "@/components/inspecciones/badges"
import { criterionText } from "@/components/inspecciones/labels"
import type { InspectionResultView } from "@/lib/types"

/** Resultados por característica con su semáforo (spec §3). */
export function InspectionResultsTable({ results }: { results: InspectionResultView[] }) {
  if (results.length === 0) return <p className="text-small text-texto-sec">Esta inspección no tiene características registradas.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-body">
        <thead>
          <tr className="border-b border-borde text-left text-caption text-texto-sec">
            <th className="py-2 pr-3 font-medium">Característica</th>
            <th className="py-2 pr-3 font-medium">Criterio</th>
            <th className="py-2 pr-3 font-medium">Resultado</th>
            <th className="py-2 font-medium">Cumplimiento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {results.map((r, i) => (
            <tr key={i}>
              <td className="py-2 pr-3">{r.name}</td>
              <td className="py-2 pr-3 text-texto-sec">{criterionText(r)}</td>
              <td className="py-2 pr-3 tabular-nums">
                {r.type === "pasa_falla"
                  ? (r.passed ? "Pasa" : "No pasa")
                  : (r.value === null ? "—" : `${r.value}${r.unit ? ` ${r.unit}` : ""}`)}
              </td>
              <td className="py-2"><CriterionDot ok={r.ok} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
