"use client"

import { ChartLineIcon, ExternalLinkIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { ComplianceBadge } from "@/components/indicadores/badges"
import { formatPeriod, formatValue } from "@/components/indicadores/labels"
import { computeCompliance } from "@/lib/data/indicators-mock"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { ComplianceStatus, IndicatorDetail, IndicatorMeasurementView } from "@/lib/types"

export function MeasurementList({ indicator }: { indicator: IndicatorDetail }) {
  const { measurements, canMeasure } = indicator

  function generateNc(id: string) {
    // TODO(backend): server action generateNcFromMeasurement.
    toast.success("No conformidad generada desde la medición.")
    void id
  }

  if (measurements.length === 0) {
    return (
      <EmptyState
        icon={ChartLineIcon}
        title="Aún no hay mediciones"
        description={canMeasure ? "Registra la medición del periodo." : "El responsable registrará las mediciones."}
        action={canMeasure ? <MeasurementSheet indicator={indicator} /> : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Escritorio */}
      <div className="hidden overflow-hidden rounded-lg border border-borde md:block">
        <Table>
          <THead>
            <Tr><Th>Periodo</Th><Th>Valor</Th><Th>Cumplimiento</Th><Th>Nota</Th><Th>Capturó</Th><Th /></Tr>
          </THead>
          <tbody>
            {measurements.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap">{formatPeriod(m.period)}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatValue(m.value, indicator.unit)}
                  {m.numerator !== null && m.denominator !== null && (
                    <span className="ml-1 text-caption text-texto-sec">({m.numerator}/{m.denominator})</span>
                  )}
                </Td>
                <Td><ComplianceBadge status={m.compliance} /></Td>
                <Td className="max-w-xs truncate text-texto-sec">{m.note ?? "—"}</Td>
                <Td className="whitespace-nowrap text-texto-sec">{m.capturedByName}</Td>
                <Td>{renderNc(m, canMeasure, generateNc)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      {/* Móvil */}
      <ul className="flex flex-col gap-2 md:hidden">
        {measurements.map((m) => (
          <li key={m.id} className="rounded-lg border border-borde bg-superficie p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{formatPeriod(m.period)}</span>
              <ComplianceBadge status={m.compliance} />
            </div>
            <p className="mt-1 text-body tabular-nums">
              {formatValue(m.value, indicator.unit)}
              {m.numerator !== null && m.denominator !== null && <span className="ml-1 text-caption text-texto-sec">({m.numerator}/{m.denominator})</span>}
            </p>
            {m.note && <p className="mt-1 text-small text-texto-sec">{m.note}</p>}
            <p className="mt-1 text-caption text-texto-sec">Capturó: {m.capturedByName}</p>
            <div className="mt-2">{renderNc(m, canMeasure, generateNc)}</div>
          </li>
        ))}
      </ul>
      {canMeasure && <div><MeasurementSheet indicator={indicator} /></div>}
    </div>
  )
}

function renderNc(m: IndicatorMeasurementView, canMeasure: boolean, generateNc: (id: string) => void) {
  if (m.compliance !== "no_cumple") return null
  if (m.nonconformityCode) {
    return (
      <Link href={`/app/no-conformidades/${m.nonconformityCode}`} className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline">
        <ExternalLinkIcon className="size-3.5" /> {m.nonconformityCode}
      </Link>
    )
  }
  return canMeasure ? (
    <Button size="sm" variant="outline" onClick={() => generateNc(m.id)}>Generar NC</Button>
  ) : null
}

function MeasurementSheet({ indicator }: { indicator: IndicatorDetail }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState("")
  const [value, setValue] = useState("")
  const [num, setNum] = useState("")
  const [den, setDen] = useState("")
  const [note, setNote] = useState("")

  // Cumplimiento estimado en vivo (mismo cálculo que el RPC).
  const estimate = useMemo<{ v: number; c: ComplianceStatus } | null>(() => {
    const v = indicator.isRate
      ? (Number(num) && Number(den) ? (Number(num) / Number(den)) * (indicator.unit === "%" ? 100 : 1) : NaN)
      : Number(value)
    if (!Number.isFinite(v)) return null
    return { v, c: computeCompliance(indicator.direction, indicator.target, indicator.targetMax, indicator.tolerancePct, v) }
  }, [indicator, value, num, den])

  function submit() {
    if (!period) { toast.error("Indica el periodo."); return }
    if (indicator.isRate ? (!num || !den) : value.trim() === "") { toast.error("Captura el valor."); return }
    if (indicator.isRate && Number(den) === 0) { toast.error("El denominador no puede ser cero."); return }
    if (estimate?.c === "no_cumple" && note.trim().length < 3) { toast.error("Explica la desviación en la nota."); return }
    // TODO(backend): server action recordMeasurement.
    toast.success("Medición registrada.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><PlusIcon /> Registrar medición</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Registrar medición</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="meas-period">Periodo</Label>
            <input id="meas-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
          </div>
          {indicator.isRate ? (
            <div className="grid grid-cols-2 gap-3">
              <div className={field}><Label htmlFor="meas-num">Numerador</Label><Input id="meas-num" type="number" value={num} onChange={(e) => setNum(e.target.value)} /></div>
              <div className={field}><Label htmlFor="meas-den">Denominador</Label><Input id="meas-den" type="number" value={den} onChange={(e) => setDen(e.target.value)} /></div>
            </div>
          ) : (
            <div className={field}><Label htmlFor="meas-value">Valor ({indicator.unit})</Label><Input id="meas-value" type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          )}
          {estimate && (
            <div className="flex items-center gap-2 text-small">
              <span className="text-texto-sec">Cumplimiento estimado:</span>
              <ComplianceBadge status={estimate.c} />
              <span className="tabular-nums text-texto-sec">{formatValue(Number(estimate.v.toFixed(2)), indicator.unit)}</span>
            </div>
          )}
          <div className={field}>
            <Label htmlFor="meas-note">Nota {estimate?.c === "no_cumple" ? "(requerida)" : "(opcional)"}</Label>
            <Textarea id="meas-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explicación o plan si no cumple" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Guardar medición</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
