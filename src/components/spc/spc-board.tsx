"use client"

import { ActivitySquareIcon, DownloadIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { CapabilityPanel } from "@/components/spc/capability-panel"
import { ControlChart } from "@/components/spc/control-chart"
import { SignalList } from "@/components/spc/signal-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCsv, toCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { computeCapability, computeImr, detectSignals, SPC_MIN_POINTS } from "@/lib/spc/compute"
import type { SpcSeries } from "@/lib/types"

export function SpcBoard({ series }: { series: SpcSeries[] }) {
  const [key, setKey] = useState(series[0]?.key ?? "")
  const current = useMemo(() => series.find((s) => s.key === key) ?? series[0] ?? null, [series, key])

  const analysis = useMemo(() => {
    if (!current) return null
    const values = current.points.map((p) => p.value)
    const imr = computeImr(values)
    const cap = computeCapability(imr.xbar, imr.sigma, current.lsl, current.usl)
    const signals = detectSignals(values, imr.xbar, imr.uclX, imr.lclX)
    const flaggedX = new Set(signals.map((s) => s.index))
    return { values, imr, cap, signals, flaggedX }
  }, [current])

  if (series.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ActivitySquareIcon}
          title="Aún no hay suficientes mediciones."
          description="Registra inspecciones con características numéricas para ver sus cartas de control."
        />
      </Card>
    )
  }
  if (!current || !analysis) return null

  const { values, imr, cap, signals, flaggedX } = analysis
  const labels = current.points.map((p) => p.code)
  const unit = current.unit
  const insufficient = !imr.hasLimits

  function exportCsv() {
    try {
      const rows = current!.points.map((p, i) => ({ ...p, bad: flaggedX.has(i) }))
      const csv = toCsv(rows, [
        { header: "Código", value: (p) => p.code },
        { header: "Fecha", value: (p) => p.at },
        { header: "Valor", value: (p) => String(p.value) },
        { header: "Fuera de control", value: (p) => (p.bad ? "Sí" : "No") },
      ])
      downloadCsv(`spc-${current!.name}-${todayIsoDate()}.csv`, csv)
    } catch {
      toast.error("No pudimos exportar el CSV.")
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={current.key} onValueChange={setKey}>
          <SelectTrigger className="sm:w-96" aria-label="Característica"><SelectValue /></SelectTrigger>
          <SelectContent>
            {series.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.name} · {s.planName} ({s.points.length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}><DownloadIcon /> Exportar CSV</Button>
      </div>

      {insufficient && (
        <p className="rounded-md bg-advertencia-suave p-3 text-small text-advertencia-texto">
          Datos insuficientes para límites de control (se necesitan al menos {SPC_MIN_POINTS} puntos). Se muestra la serie sin límites.
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>Carta de control — {current.name}{unit ? ` (${unit})` : ""}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ControlChart values={values} labels={labels} center={imr.xbar} ucl={imr.uclX} lcl={imr.lclX} flagged={flaggedX} unit={unit} title="Individuos (X)" />
          <ControlChart values={imr.mr} labels={labels.slice(1)} center={imr.mrbar} ucl={imr.hasLimits ? imr.uclMr : null} lcl={imr.hasLimits ? imr.lclMr : null} flagged={new Set()} unit={unit} title="Rango móvil (MR)" />
        </CardContent>
      </Card>

      <CapabilityPanel cap={cap} xbar={imr.xbar} sigma={imr.sigma} lsl={current.lsl} usl={current.usl} unit={unit} />

      <Card>
        <CardHeader><CardTitle>Señales de descontrol</CardTitle></CardHeader>
        <CardContent><SignalList signals={signals} points={current.points} hasLimits={imr.hasLimits} /></CardContent>
      </Card>
    </div>
  )
}
