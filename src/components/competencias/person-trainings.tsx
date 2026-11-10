"use client"

import { DownloadIcon, GraduationCapIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TrainingKindChip } from "@/components/competencias/badges"
import { RESULT_LABELS } from "@/components/competencias/labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDate, todayIsoDate } from "@/lib/format"
import type { TrainingAttendeeView, TrainingResult } from "@/lib/types"

const RESULTS = Object.keys(RESULT_LABELS) as TrainingResult[]

/** Un certificado vence pronto si es ≤ 60 días o ya venció. */
function dueSoon(validUntil: string | null): boolean {
  if (!validUntil) return false
  const diff = (new Date(validUntil).getTime() - Date.now()) / 86_400_000
  return diff <= 60
}

export function PersonTrainings({ items, canManage }: { items: TrainingAttendeeView[]; canManage: boolean }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCapIcon}
          title="Sin formación registrada"
          description="Registra la formación de esta persona y adjunta su certificado."
          action={canManage ? <RegisterTrainingSheet /> : undefined}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {canManage && <div><RegisterTrainingSheet /></div>}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-borde">
          {items.map((t) => (
            <li key={t.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body">{t.title}</p>
                <TrainingKindChip kind={t.kind} />
                <Badge tone={t.result === "aprobado" ? "exito" : t.result === "no_aprobado" ? "error" : "neutro"}>{RESULT_LABELS[t.result]}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-texto-sec">
                <span>{t.provider ? `${t.provider} · ` : ""}{formatDate(t.trainingDate)}{t.hours ? ` · ${t.hours} h` : ""}</span>
                {t.hasCertificate ? (
                  <button onClick={() => toast.success("Descarga disponible al conectar el backend.")} className="inline-flex items-center gap-1 font-medium text-acento hover:underline">
                    <DownloadIcon className="size-3.5" /> {t.certificateName ?? "Certificado"}
                  </button>
                ) : (
                  <span>Sin certificado</span>
                )}
                {t.validUntil && (
                  <span className={dueSoon(t.validUntil) ? "font-medium text-advertencia-texto" : ""}>vence {formatDate(t.validUntil)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function RegisterTrainingSheet() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [result, setResult] = useState<TrainingResult>("asistio")
  const [date, setDate] = useState("")
  const [validUntil, setValidUntil] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("Escribe el título de la formación."); return }
    if (!date) { toast.error("Indica la fecha."); return }
    if (date > todayIsoDate()) { toast.error("La fecha no puede ser futura."); return }
    // TODO(backend): registerPersonTraining({ title, result, date, validUntil, certificate })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><PlusIcon /> Registrar formación</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Registrar formación</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="pt-title">Formación</Label>
            <Input id="pt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la capacitación" />
          </div>
          <div className={field}>
            <Label>Resultado</Label>
            <Select value={result} onValueChange={(v) => setResult(v as TrainingResult)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESULTS.map((r) => <SelectItem key={r} value={r}>{RESULT_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="pt-date">Fecha</Label>
              <input id="pt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
            </div>
            <div className={field}>
              <Label htmlFor="pt-valid">Vence (opcional)</Label>
              <input id="pt-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
            </div>
          </div>
          <p className="text-caption text-texto-sec">El certificado (PDF/imagen) se adjunta al conectar el backend (patrón de evidencia).</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
