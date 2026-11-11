"use client"

import { CheckCircle2Icon, PencilIcon, ShieldAlertIcon, SlidersHorizontalIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { DISPOSITION_LABELS } from "@/components/salidas-no-conformes/labels"
import { closeOutput, generateNcFromNcOutput, setOutputDisposition, updateNcOutput } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Disposition, NcOutputDetail } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const DISPOSITIONS = Object.keys(DISPOSITION_LABELS) as Disposition[]

export function EditNcOutputSheet({ output, processes }: { output: NcOutputDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState(output.description)
  const [processId, setProcessId] = useState(output.processId ?? "")
  const [detectedDate, setDetectedDate] = useState(output.detectedDate)
  const [identification, setIdentification] = useState(output.identification ?? "")

  function submit() {
    if (description.trim().length < 3) { toast.error("Describe la salida."); return }
    start(async () => {
      const r = await updateNcOutput(output.id, {
        description, processId: processId || null, detectedDate, identification: identification.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false); toast.success("Salida actualizada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar salida</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="e-desc">Descripción</Label>
            <Textarea id="e-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={field}><Label>Proceso (opcional)</Label>
            <Select value={processId || "none"} onValueChange={(v) => setProcessId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin proceso)</SelectItem>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="e-date">Fecha de detección</Label>
            <Input id="e-date" type="date" value={detectedDate} onChange={(e) => setDetectedDate(e.target.value)} className="w-48" />
          </div>
          <div className={field}><Label htmlFor="e-id">Identificación (opcional)</Label>
            <Input id="e-id" value={identification} onChange={(e) => setIdentification(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function DispositionSheet({ output, positions }: { output: NcOutputDetail; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [disposition, setDisposition] = useState<Disposition | "">(output.disposition ?? "")
  const [detail, setDetail] = useState(output.dispositionDetail ?? "")
  const [customerInformed, setCustomerInformed] = useState(output.customerInformed)
  const [responsibleId, setResponsibleId] = useState("")

  function submit() {
    if (!disposition) { toast.error("Elige la disposición."); return }
    start(async () => {
      const r = await setOutputDisposition(output.id, {
        disposition, detail: detail.trim() || undefined, customerInformed,
        responsiblePositionId: responsibleId || null,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false); toast.success("Disposición aplicada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><SlidersHorizontalIcon /> Aplicar disposición</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Aplicar disposición</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label>Tipo de disposición</Label>
            <Select value={disposition || "none"} onValueChange={(v) => setDisposition(v === "none" ? "" : (v as Disposition))}>
              <SelectTrigger><SelectValue placeholder="Elige" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(elige una)</SelectItem>
                {DISPOSITIONS.map((x) => <SelectItem key={x} value={x}>{DISPOSITION_LABELS[x]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="d-detail">Detalle (opcional)</Label>
            <Textarea id="d-detail" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-body">¿Se informó / obtuvo concesión del cliente?</span>
            <Switch checked={customerInformed} onCheckedChange={setCustomerInformed} />
          </label>
          <div className={field}><Label>Responsable (cargo, opcional)</Label>
            <Select value={responsibleId || "none"} onValueChange={(v) => setResponsibleId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin responsable)</SelectItem>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Aplicar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CloseOutputButton({ output }: { output: NcOutputDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const canClose = output.disposition != null
  function run() {
    if (!canClose) { toast.error("Aplica una disposición antes de cerrar."); return }
    if (!confirm("La salida se cerrará. ¿Continuar?")) return
    start(async () => {
      const r = await closeOutput(output.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Salida cerrada."); router.refresh()
    })
  }
  return <Button size="sm" onClick={run} loading={pending} disabled={!canClose}><CheckCircle2Icon /> Cerrar salida</Button>
}

export function GenerateNcButton({ output }: { output: NcOutputDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("Se creará una no conformidad (10.2) a partir de esta salida. ¿Continuar?")) return
    start(async () => {
      const r = await generateNcFromNcOutput(output.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`No conformidad ${r.data.code} creada.`); router.refresh()
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><ShieldAlertIcon /> Generar NC</Button>
}
