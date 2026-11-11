"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FREQUENCY_LABELS, SOURCE_LABELS } from "@/components/requisitos-legales/labels"
import { createRequirement, exportLegalCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { LegalFrequency, LegalSource } from "@/lib/types"

type ProcessOption = { id: string; name: string }
const SOURCES = Object.keys(SOURCE_LABELS) as LegalSource[]
const FREQS = Object.keys(FREQUENCY_LABELS) as LegalFrequency[]

export function ExportLegalButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`requisitos-legales-${todayIsoDate()}.csv`, await exportLegalCsv()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function NewRequirementSheet({ processes }: { processes: ProcessOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [sourceType, setSourceType] = useState<LegalSource>("decreto")
  const [reference, setReference] = useState("")
  const [issuer, setIssuer] = useState("")
  const [description, setDescription] = useState("")
  const [processId, setProcessId] = useState("")
  const [url, setUrl] = useState("")
  const [frequency, setFrequency] = useState<LegalFrequency>("anual")

  function submit() {
    if (title.trim().length < 3) { toast.error("Indica el título."); return }
    if (reference.trim().length < 1) { toast.error("Indica la referencia legal."); return }
    if (description.trim().length < 3) { toast.error("Describe qué exige."); return }
    start(async () => {
      const r = await createRequirement({
        title, sourceType, reference, issuer: issuer.trim() || undefined, description,
        processId: processId || null, url: url.trim() || undefined, frequency,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Requisito ${r.data.code} creado.`)
      setOpen(false)
      router.push(`/app/requisitos-legales/${r.data.code}`)
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button><PlusIcon /> Nuevo requisito</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo requisito</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="rq-title">Título</Label>
            <Input id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Estándares mínimos SG-SST" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Fuente</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as LegalSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((sfx) => <SelectItem key={sfx} value={sfx}>{SOURCE_LABELS[sfx]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as LegalFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label htmlFor="rq-ref">Referencia legal</Label>
            <Input id="rq-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="p. ej. Decreto 1072/2015, art. 2.2.4.6" />
          </div>
          <div className={field}><Label htmlFor="rq-issuer">Entidad emisora (opcional)</Label>
            <Input id="rq-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="p. ej. Mintrabajo" />
          </div>
          <div className={field}><Label htmlFor="rq-desc">Qué exige</Label>
            <Textarea id="rq-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <div className={field}><Label htmlFor="rq-url">Enlace a la norma (opcional)</Label>
            <Input id="rq-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear requisito</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
