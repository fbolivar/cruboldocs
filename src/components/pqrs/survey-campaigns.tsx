"use client"

import { CheckIcon, CopyIcon, DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { SATISFACTION_METHOD_LABELS, formatPeriod, satisfactionLabel } from "@/components/pqrs/labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { closeSurvey, createSurvey, exportSurveyCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import type { SurveyCampaign, SurveyMethod, SurveyScale } from "@/lib/types"

type ProcessOption = { id: string; name: string }
const SCALE_LABEL: Record<SurveyScale, string> = { "0_100": "0–100", "1_5": "1–5 estrellas", nps_0_10: "NPS 0–10" }

function surveyLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/encuesta/${token}`
}

export function SurveyCampaigns({ campaigns, canManage, processes }: {
  campaigns: SurveyCampaign[]
  canManage: boolean
  processes: ProcessOption[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-small font-medium text-texto">Campañas de encuesta</h3>
        {canManage && <NewSurveySheet processes={processes} />}
      </div>
      {campaigns.length === 0 ? (
        <EmptyState icon={PlusIcon} title="Aún no tienes campañas de encuesta" description={canManage ? "Crea una con «Nueva encuesta» y comparte el link." : undefined} />
      ) : (
        <ul className="divide-y divide-borde">
          {campaigns.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-body">
                  <span className="font-mono text-caption text-texto-sec">{c.code}</span> · {c.title}
                </p>
                <p className="text-caption text-texto-sec">
                  {SATISFACTION_METHOD_LABELS[c.method]} · {formatPeriod(c.period)} · {c.responseCount} resp.
                  {c.avgScore !== null ? ` · promedio ${Math.round(c.avgScore)} (${satisfactionLabel(c.avgScore)})` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={c.status === "abierta" ? "info" : "exito"}>{c.status === "abierta" ? "Abierta" : "Cerrada"}</Badge>
                {canManage && c.status === "abierta" && <CopyLinkButton token={c.token} />}
                {canManage && <CsvButton surveyId={c.id} code={c.code} />}
                {canManage && c.status === "abierta" && <CloseButton surveyId={c.id} disabled={c.responseCount === 0} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CopyLinkButton({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(surveyLink(token))
      setDone(true); toast.success("Link copiado.")
      setTimeout(() => setDone(false), 2000)
    } catch { toast.error("No pudimos copiar el link.") }
  }
  return <Button size="sm" variant="outline" onClick={copy}>{done ? <CheckIcon /> : <CopyIcon />} Copiar link</Button>
}

function CsvButton({ surveyId, code }: { surveyId: string; code: string }) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`${code}-${todayIsoDate()}.csv`, await exportSurveyCsv(surveyId)) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button size="sm" variant="outline" onClick={run} loading={pending}><DownloadIcon /> CSV</Button>
}

function CloseButton({ surveyId, disabled }: { surveyId: string; disabled: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("Al cerrar se registrará el promedio como la medición de satisfacción del periodo. ¿Continuar?")) return
    start(async () => {
      const r = await closeSurvey(surveyId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Encuesta cerrada; medición registrada."); router.refresh()
    })
  }
  return <Button size="sm" onClick={run} loading={pending} disabled={disabled} title={disabled ? "Aún no hay respuestas" : undefined}>Cerrar</Button>
}

function NewSurveySheet({ processes }: { processes: ProcessOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [method, setMethod] = useState<SurveyMethod>("csat")
  const [scale, setScale] = useState<SurveyScale>("0_100")
  const [period, setPeriod] = useState("")
  const [processId, setProcessId] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("Indica el título."); return }
    if (!period) { toast.error("Indica el periodo."); return }
    start(async () => {
      const r = await createSurvey({ title, method, scale, period, processId: processId || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Encuesta ${r.data.code} creada.`)
      setLink(surveyLink(r.data.token))
      router.refresh()
    })
  }

  function reset() { setOpen(false); setLink(null); setTitle(""); setPeriod(""); setProcessId("") }

  const field = "flex flex-col gap-1.5"
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Nueva encuesta</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva encuesta</SheetTitle></SheetHeader>
        {link ? (
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-body">Comparte este link con tus clientes:</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="font-mono text-caption" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link).then(() => toast.success("Link copiado.")) }}><CopyIcon /></Button>
            </div>
            <p className="text-caption text-texto-sec">Las respuestas son anónimas. Al cerrar la campaña, el promedio queda como la medición del periodo.</p>
            <Button variant="outline" onClick={reset}>Listo</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className={field}><Label htmlFor="sv-title">Título</Label>
                <Input id="sv-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Satisfacción noviembre 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={field}><Label>Método</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as SurveyMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csat">CSAT</SelectItem>
                      <SelectItem value="nps">NPS</SelectItem>
                      <SelectItem value="encuesta">Encuesta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={field}><Label>Escala</Label>
                  <Select value={scale} onValueChange={(v) => setScale(v as SurveyScale)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0_100">{SCALE_LABEL["0_100"]}</SelectItem>
                      <SelectItem value="1_5">{SCALE_LABEL["1_5"]}</SelectItem>
                      <SelectItem value="nps_0_10">{SCALE_LABEL.nps_0_10}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={field}><Label htmlFor="sv-period">Periodo</Label>
                <input id="sv-period" type="date" value={period} onChange={(e) => setPeriod(e.target.value)} className={dateInput} />
              </div>
              <div className={field}><Label>Proceso (opcional)</Label>
                <Select value={processId} onValueChange={setProcessId}>
                  <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                  <SelectContent>
                    {processes.length === 0 ? <SelectItem value="none" disabled>(sin procesos)</SelectItem>
                      : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear y generar link</Button></SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
