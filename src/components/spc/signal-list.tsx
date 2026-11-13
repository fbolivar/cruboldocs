import { CheckCircle2Icon } from "lucide-react"

import { SPC_RULE_LABELS, type SpcSignal } from "@/lib/spc/compute"
import { formatDate } from "@/lib/format"
import type { SpcPoint } from "@/lib/types"

/** Señales de descontrol (regla + punto). Si no hay, el proceso está bajo control. */
export function SignalList({ signals, points, hasLimits }: { signals: SpcSignal[]; points: SpcPoint[]; hasLimits: boolean }) {
  if (!hasLimits) {
    return <p className="text-small text-texto-sec">Sin límites de control (datos insuficientes); no se evalúan señales.</p>
  }
  if (signals.length === 0) {
    return (
      <p className="inline-flex items-center gap-2 text-small text-exito-texto">
        <CheckCircle2Icon className="size-4" /> Proceso bajo control (sin señales).
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {signals.map((sig, i) => {
        const p = points[sig.index]
        return (
          <li key={`${sig.rule}-${sig.index}-${i}`} className="flex items-center gap-2 text-small">
            <span aria-hidden="true" className="size-2 rounded-full bg-error-texto" />
            <span className="font-medium text-error-texto">{SPC_RULE_LABELS[sig.rule]}</span>
            {p && <span className="text-texto-sec">· {p.code} · {formatDate(p.at)} · {p.value}</span>}
          </li>
        )
      })}
    </ul>
  )
}
