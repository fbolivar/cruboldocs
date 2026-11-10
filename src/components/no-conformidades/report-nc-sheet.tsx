"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { reportNonconformity } from "@/lib/data/actions"
import { SEVERITY_LABELS, SOURCE_LABELS } from "@/components/no-conformidades/labels"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { NcSeverity, NcSource } from "@/lib/types"

const SOURCES = Object.keys(SOURCE_LABELS) as NcSource[]
const SEVERITIES = Object.keys(SEVERITY_LABELS) as NcSeverity[]
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Reportar una no conformidad. Disponible para cualquier miembro activo. El envío se conecta en la
 * fase de backend (server action); por ahora valida y confirma localmente.
 */
export function ReportNcSheet({ processes }: { processes: { id: string; code: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [source, setSource] = useState<NcSource | "">("")
  const [process, setProcess] = useState<string>("")
  const [severity, setSeverity] = useState<NcSeverity>("menor")
  const [detectedAt, setDetectedAt] = useState(today())

  function submit() {
    if (description.trim().length < 5 || !source) {
      toast.error("Describe qué pasó e indica el origen.")
      return
    }
    start(async () => {
      const r = await reportNonconformity({
        description,
        source,
        processId: process || null,
        severity,
        detectedAt,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(`No conformidad ${r.data.code} reportada. Un líder del SIG la gestionará.`)
      setOpen(false)
      setDescription("")
      setSource("")
      setProcess("")
      setSeverity("menor")
      setDetectedAt(today())
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusIcon />
          Reportar no conformidad
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Reportar no conformidad</SheetTitle>
          <SheetDescription>
            Cuéntanos qué pasó. Un líder del SIG recibirá el aviso y la gestionará (causa y acciones).
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="nc-desc">Descripción</Label>
            <Textarea
              id="nc-desc"
              rows={4}
              placeholder="Qué pasó, dónde y desde cuándo…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={field}>
            <Label>Origen</Label>
            <Select value={source} onValueChange={(v) => setSource(v as NcSource)}>
              <SelectTrigger>
                <SelectValue placeholder="¿De dónde surge?" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={field}>
            <Label>Proceso (opcional)</Label>
            <Select value={process} onValueChange={setProcess}>
              <SelectTrigger>
                <SelectValue placeholder="Proceso afectado" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={field}>
            <Label>Severidad</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as NcSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-texto-sec">Un líder puede ajustarla al analizarla.</p>
          </div>

          <div className={field}>
            <Label htmlFor="nc-date">Fecha de detección</Label>
            <input
              id="nc-date"
              type="date"
              value={detectedAt}
              max={today()}
              onChange={(e) => setDetectedAt(e.target.value)}
              className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
            />
          </div>
        </div>

        <SheetFooter className="border-t border-borde">
          <Button onClick={submit} loading={pending}>Reportar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
