"use client"

import { PlusIcon, SmileIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { SATISFACTION_METHOD_LABELS, formatPeriod, satisfactionLabel } from "@/components/pqrs/labels"
import { SatisfactionGauge } from "@/components/pqrs/satisfaction-gauge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { SatisfactionMeasurementView, SatisfactionMethod } from "@/lib/types"

const METHODS = Object.keys(SATISFACTION_METHOD_LABELS) as SatisfactionMethod[]

export function SatisfactionPanel({ items, canManage }: { items: SatisfactionMeasurementView[]; canManage: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Satisfacción del cliente (9.1.2)</CardTitle>
        {canManage && <RecordSatisfactionSheet />}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={SmileIcon} title="Aún no registras la satisfacción del cliente" description="Registra la medición del periodo (encuesta, NPS, CSAT…)." />
        ) : (
          <ul className="divide-y divide-borde">
            {items.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-small text-texto-sec">
                  {formatPeriod(m.period)} · {SATISFACTION_METHOD_LABELS[m.method]}{m.responses ? ` · ${m.responses} resp.` : ""}
                </span>
                <SatisfactionGauge score={m.score} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RecordSatisfactionSheet() {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState("")
  const [method, setMethod] = useState<SatisfactionMethod>("encuesta")
  const [score, setScore] = useState("")
  const [responses, setResponses] = useState("")
  const [note, setNote] = useState("")

  const n = Number(score)
  const valid = score !== "" && !Number.isNaN(n) && n >= 0 && n <= 100

  function submit() {
    if (!period) { toast.error("Indica el periodo."); return }
    if (!valid) { toast.error("El puntaje va de 0 a 100."); return }
    // TODO(backend): recordSatisfaction({ period, method, score, responses, note })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><PlusIcon /> Registrar satisfacción</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Registrar satisfacción</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="sat-period">Periodo</Label>
            <input id="sat-period" type="date" value={period} onChange={(e) => setPeriod(e.target.value)} className={dateInput} />
          </div>
          <div className={field}>
            <Label>Método</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as SatisfactionMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{SATISFACTION_METHOD_LABELS[m]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="sat-score">Puntaje (0–100)</Label>
              <Input id="sat-score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className={field}>
              <Label htmlFor="sat-resp">Respuestas (opc.)</Label>
              <Input id="sat-resp" type="number" min={0} value={responses} onChange={(e) => setResponses(e.target.value)} />
            </div>
          </div>
          {valid && (
            <div className="rounded-md bg-superficie-alt p-3 text-small">
              Semáforo: <span className="font-medium">{satisfactionLabel(n)}</span> ({n}/100)
            </div>
          )}
          <div className={field}>
            <Label htmlFor="sat-note">Nota (opc.)</Label>
            <Textarea id="sat-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
