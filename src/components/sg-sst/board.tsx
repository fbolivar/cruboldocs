"use client"

import { HardHatIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ItemStatusChip, SstRatingBadge, SstScoreGauge } from "@/components/sg-sst/badges"
import { RISK_CLASSES, sstTier } from "@/components/sg-sst/labels"
import { createEvaluation } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { SstEvaluationListItem, SstSummary } from "@/lib/types"

const PATH = "/app/sg-sst"
const field = "flex flex-col gap-1.5"

export function SstSummaryBar({ summary }: { summary: SstSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      <Card className="p-4 lg:col-span-1">
        <p className="text-caption text-texto-sec">Puntaje {summary.period ?? ""}</p>
        <div className="mt-1"><SstScoreGauge score={summary.score} rating={summary.rating} /></div>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Cumple / No aplica</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.cumple}<span className="text-body text-texto-sec"> / {summary.noAplica}</span></p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">No cumple</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.noCumple > 0 ? "text-error-texto" : "text-texto"}`}>{summary.noCumple}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Mejoras abiertas</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.openActions}
          {summary.overdueActions > 0 && <span className="text-body text-error-texto"> ({summary.overdueActions} venc.)</span>}
        </p>
      </Card>
    </div>
  )
}

export function SstBoard({ items }: { items: SstEvaluationListItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={HardHatIcon} title="Aún no has hecho tu autoevaluación" description="Crea la primera con «Nueva autoevaluación»." />
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-borde">
        {items.map((e) => (
          <li key={e.id} className="relative p-4 hover:bg-superficie-alt">
            <Link href={`${PATH}/${e.code}`} className="absolute inset-0" aria-label={`Abrir ${e.code}`} />
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="font-mono text-caption text-texto-sec">{e.code}</p>
                <p className="text-body">{e.period} · Nivel {e.tier}</p>
                <span className="text-caption text-texto-sec">({e.workerCount} trab., riesgo {e.riskClass})</span>
              </div>
              <div className="flex items-center gap-2">
                {e.score !== null && <span className="font-display tabular-nums text-texto">{e.score.toFixed(1)}</span>}
                {e.status === "borrador" ? <ItemStatusChip status="pendiente" /> : e.rating && <SstRatingBadge rating={e.rating} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function NewEvaluationSheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState(new Date().getFullYear())
  const [workers, setWorkers] = useState(1)
  const [risk, setRisk] = useState(1)
  const tier = sstTier(workers, risk)

  function submit() {
    if (period < 2019 || workers < 1) { toast.error("Revisa el período y el número de trabajadores."); return }
    start(async () => {
      const r = await createEvaluation({ period, workers, risk })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      router.push(`${PATH}/${r.data.code}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nueva autoevaluación</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva autoevaluación</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="ev-period">Período (año)</Label>
            <Input id="ev-period" type="number" value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
          </div>
          <div className={field}><Label htmlFor="ev-workers">Número de trabajadores</Label>
            <Input id="ev-workers" type="number" min={1} value={workers} onChange={(e) => setWorkers(Number(e.target.value))} />
          </div>
          <div className={field}><Label>Clase de riesgo</Label>
            <Select value={String(risk)} onValueChange={(v) => setRisk(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_CLASSES.map((c) => <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-borde bg-superficie-alt p-3 text-small">
            Nivel aplicable: <span className="font-semibold text-texto">{tier} estándares</span>
            <span className="text-texto-sec"> — se evaluarán los estándares de ese nivel.</span>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear y diligenciar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
