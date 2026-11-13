import { capabilityTone, type Capability } from "@/lib/spc/compute"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(2))
const TONE_LABEL: Record<ReturnType<typeof capabilityTone>, string> = {
  exito: "Capaz", advertencia: "Marginal", error: "No capaz", neutro: "—",
}

/** Panel de capacidad: Cp/Cpk con el rango usado (LSL–USL) y semáforo por Cpk. */
export function CapabilityPanel({
  cap, xbar, sigma, lsl, usl, unit,
}: {
  cap: Capability
  xbar: number
  sigma: number | null
  lsl: number | null
  usl: number | null
  unit: string | null
}) {
  const tone = capabilityTone(cap.cpk)
  const u = unit ? ` ${unit}` : ""
  const notCalculable = cap.cpk === null
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-texto-sec">Capacidad del proceso</p>
        {!notCalculable && <Badge tone={tone}>{TONE_LABEL[tone]}</Badge>}
      </div>
      {notCalculable ? (
        <p className="mt-2 text-small text-texto-sec">
          No calculable — {sigma === null ? "sin variación suficiente (σ̂)" : "falta el rango de especificación del plan"}.
        </p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div><p className="text-caption text-texto-sec">Cp</p><p className="font-display text-h3 tabular-nums">{fmt(cap.cp)}</p></div>
            <div><p className="text-caption text-texto-sec">Cpk</p><p className="font-display text-h3 tabular-nums">{fmt(cap.cpk)}</p></div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-caption text-texto-sec sm:grid-cols-4">
            <div><dt>Especificación</dt><dd className="tabular-nums text-texto">{lsl ?? "—"}–{usl ?? "—"}{u}</dd></div>
            <div><dt>Media (X̄)</dt><dd className="tabular-nums text-texto">{xbar.toFixed(2)}{u}</dd></div>
            <div><dt>σ̂</dt><dd className="tabular-nums text-texto">{sigma === null ? "—" : sigma.toFixed(3)}</dd></div>
          </dl>
        </>
      )}
    </Card>
  )
}
