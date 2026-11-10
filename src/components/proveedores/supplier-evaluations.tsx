"use client"

import { ClipboardListIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { ResultBadge } from "@/components/proveedores/badges"
import { CRITERIA, RESULT_LABELS, estimateEvaluation, formatScore } from "@/components/proveedores/labels"
import { evaluateSupplier } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { EvaluationKind, SupplierEvaluationView } from "@/lib/types"

export function EvaluationHistory({ evaluations }: { evaluations: SupplierEvaluationView[] }) {
  if (evaluations.length === 0) {
    return <EmptyState icon={ClipboardListIcon} title="Sin evaluaciones" description="Haz la evaluación inicial del proveedor." />
  }
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-body">
          <thead>
            <tr className="border-b border-borde text-caption text-texto-sec">
              <th scope="col" className="px-4 py-2 font-medium">Fecha</th>
              <th scope="col" className="px-3 py-2 font-medium">Tipo</th>
              <th scope="col" className="px-3 py-2 font-medium">Calidad</th>
              <th scope="col" className="px-3 py-2 font-medium">Entrega</th>
              <th scope="col" className="px-3 py-2 font-medium">Servicio</th>
              <th scope="col" className="px-3 py-2 font-medium">Total</th>
              <th scope="col" className="px-3 py-2 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <tr key={e.id} className="border-b border-borde last:border-0">
                <td className="px-4 py-3">{formatDate(e.evalDate)}</td>
                <td className="px-3 py-3 capitalize text-texto-sec">{e.kind}</td>
                <td className="px-3 py-3 tabular-nums">{e.scoreQuality}</td>
                <td className="px-3 py-3 tabular-nums">{e.scoreDelivery}</td>
                <td className="px-3 py-3 tabular-nums">{e.scoreService}</td>
                <td className="px-3 py-3 tabular-nums font-medium">{formatScore(e.totalScore)}</td>
                <td className="px-3 py-3"><ResultBadge result={e.result} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-2 md:hidden">
        {evaluations.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body">{formatDate(e.evalDate)} · <span className="capitalize text-texto-sec">{e.kind}</span></span>
              <ResultBadge result={e.result} />
            </div>
            <p className="mt-1 text-caption text-texto-sec tabular-nums">
              Calidad {e.scoreQuality} · Entrega {e.scoreDelivery} · Servicio {e.scoreService} · Total {formatScore(e.totalScore)}
            </p>
          </Card>
        ))}
      </div>
    </>
  )
}

export function EvaluateSupplierSheet({ supplierId, hasEvaluations }: { supplierId: string; hasEvaluations: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<EvaluationKind>(hasEvaluations ? "periodica" : "inicial")
  const [date, setDate] = useState("")
  const [quality, setQuality] = useState("")
  const [delivery, setDelivery] = useState("")
  const [service, setService] = useState("")
  const [next, setNext] = useState("")
  const [note, setNote] = useState("")

  const scores = { quality: Number(quality) || 0, delivery: Number(delivery) || 0, service: Number(service) || 0 }
  const estimate = useMemo(() => estimateEvaluation(scores), [quality, delivery, service]) // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    if (!date) { toast.error("Indica la fecha de evaluación."); return }
    for (const v of [quality, delivery, service]) {
      const n = Number(v)
      if (v === "" || Number.isNaN(n) || n < 0 || n > 100) { toast.error("Cada criterio va de 0 a 100."); return }
    }
    start(async () => {
      const r = await evaluateSupplier({
        supplierId, kind, evalDate: date, quality: scores.quality, delivery: scores.delivery, service: scores.service,
        nextEval: next || null, note: note.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Evaluación guardada: ${RESULT_LABELS[r.data.result as keyof typeof RESULT_LABELS] ?? r.data.result}.`)
      setOpen(false)
      setQuality(""); setDelivery(""); setService(""); setNext(""); setNote("")
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  const num = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body tabular-nums md:h-9"
  const setters = { quality: setQuality, delivery: setDelivery, service: setService }
  const values: Record<string, string> = { quality, delivery, service }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>{hasEvaluations ? "Evaluar / Reevaluar" : "Hacer evaluación inicial"}</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Evaluar proveedor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as EvaluationKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inicial">Inicial</SelectItem>
                <SelectItem value="periodica">Periódica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="ev-date">Fecha de evaluación</Label>
            <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={num} />
          </div>
          {CRITERIA.map((c) => (
            <div key={c.key} className={field}>
              <Label htmlFor={`ev-${c.key}`}>{c.label} <span className="text-texto-sec">(peso {c.weight})</span></Label>
              <input
                id={`ev-${c.key}`} type="number" min={0} max={100} className={num}
                value={values[c.key]} onChange={(e) => setters[c.key as keyof typeof setters](e.target.value)}
              />
            </div>
          ))}
          <div className="rounded-md bg-superficie-alt p-3 text-small">
            Resultado estimado: <span className="font-medium tabular-nums">{formatScore(estimate.total)}/100</span> · <span className="font-medium">{RESULT_LABELS[estimate.result]}</span>
            <span className="mt-0.5 block text-caption text-texto-sec">El valor definitivo lo calcula el servidor.</span>
          </div>
          <div className={field}>
            <Label htmlFor="ev-next">Próxima reevaluación (opcional)</Label>
            <input id="ev-next" type="date" value={next} onChange={(e) => setNext(e.target.value)} className={num} />
          </div>
          <div className={field}>
            <Label htmlFor="ev-note">Nota (opcional)</Label>
            <Textarea id="ev-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar evaluación</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
