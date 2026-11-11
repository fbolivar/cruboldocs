import { AlertTriangleIcon, ChartLineIcon, ClipboardCheckIcon, ClockIcon, ShieldCheckIcon, TruckIcon } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/ui/empty-state"
import type { FocoCategory, FocoSeverity, RiskSignal } from "@/lib/focos/types"

const CAT_ICON: Record<FocoCategory, typeof ClockIcon> = {
  vencimiento: ClockIcon, indicador: ChartLineIcon, nc: ClipboardCheckIcon, proveedor: TruckIcon,
}
const SEV: Record<FocoSeverity, { label: string; dot: string; group: string }> = {
  alta: { label: "Alta", dot: "bg-error-texto", group: "Severidad alta" },
  media: { label: "Media", dot: "bg-advertencia-texto", group: "Severidad media" },
  baja: { label: "Baja", dot: "bg-borde-fuerte", group: "Severidad baja" },
}

function FocoCard({ foco }: { foco: RiskSignal }) {
  const Icon = CAT_ICON[foco.category]
  return (
    <Link href={foco.href} className="flex items-start gap-3 rounded-lg border border-borde bg-superficie p-4 hover:bg-superficie-alt">
      <span className="mt-0.5 shrink-0 text-texto-sec"><Icon className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 shrink-0 rounded-full ${SEV[foco.severity].dot}`} aria-hidden="true" />
          <span className="text-caption font-medium text-texto-sec">{SEV[foco.severity].label}</span>
        </div>
        <p className="mt-0.5 text-body font-medium text-texto">{foco.title}</p>
        <p className="text-small text-texto-sec">{foco.detail}</p>
      </div>
    </Link>
  )
}

export function FocosBoard({ focos }: { focos: RiskSignal[] }) {
  if (focos.length === 0) {
    return <EmptyState icon={ShieldCheckIcon} title="Sin focos de riesgo ahora" description="Todo al día. Vuelve a revisar más adelante." />
  }
  const by = (sev: FocoSeverity) => focos.filter((f) => f.severity === sev)
  const counts = { alta: by("alta").length, media: by("media").length, baja: by("baja").length }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-3 gap-3">
        {(["alta", "media", "baja"] as FocoSeverity[]).map((sev) => (
          <div key={sev} className="rounded-lg border border-borde bg-superficie p-4">
            <p className="flex items-center gap-1.5 text-caption text-texto-sec"><span className={`size-2.5 rounded-full ${SEV[sev].dot}`} />{SEV[sev].label}</p>
            <p className={`mt-1 font-display text-h2 tabular-nums ${sev === "alta" && counts.alta > 0 ? "text-error-texto" : "text-texto"}`}>{counts[sev]}</p>
          </div>
        ))}
      </div>
      {(["alta", "media", "baja"] as FocoSeverity[]).map((sev) => {
        const items = by(sev)
        if (items.length === 0) return null
        return (
          <div key={sev} className="flex flex-col gap-2">
            <h2 className="text-small font-medium text-texto-sec">{SEV[sev].group}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((f) => <FocoCard key={f.id} foco={f} />)}
            </div>
          </div>
        )
      })}
      <p className="flex items-center gap-1 text-caption text-texto-sec"><AlertTriangleIcon className="size-3.5" /> Señales calculadas de tus datos; revisa cada foco antes de actuar.</p>
    </div>
  )
}
