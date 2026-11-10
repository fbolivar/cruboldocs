"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Planificar una auditoría (Líder SIG). El envío se conecta en la fase de backend.
 */
export function PlanAuditSheet({
  processes,
  auditors,
}: {
  processes: { id: string; code: string }[]
  auditors: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [objective, setObjective] = useState("")
  const [criteria, setCriteria] = useState("")
  const [procIds, setProcIds] = useState<string[]>([])
  const [lead, setLead] = useState("")
  const [plannedDate, setPlannedDate] = useState("")

  function toggle(id: string) {
    setProcIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit() {
    if (title.trim().length < 3 || procIds.length === 0 || !plannedDate) {
      toast.error("Indica título, al menos un proceso y la fecha.")
      return
    }
    // TODO(backend): server action planAudit(...).
    toast.success("Auditoría planificada. El líder auditor recibirá la tarea.")
    setOpen(false)
    setTitle("")
    setObjective("")
    setCriteria("")
    setProcIds([])
    setLead("")
    setPlannedDate("")
  }

  const field = "flex flex-col gap-1.5"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusIcon />
          Planificar auditoría
        </Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Planificar auditoría</SheetTitle>
          <SheetDescription>Define el alcance, los procesos y el líder auditor.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="aud-title">Título</Label>
            <Input id="aud-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auditoría interna SGC 2026-2" />
          </div>
          <div className={field}>
            <Label htmlFor="aud-obj">Objetivo (opcional)</Label>
            <Textarea id="aud-obj" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className={field}>
            <Label htmlFor="aud-crit">Criterios (opcional)</Label>
            <Textarea id="aud-crit" rows={2} value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="ISO 9001:2015, procedimientos, normograma" />
          </div>
          <div className={field}>
            <Label>Procesos auditados</Label>
            <div className="flex flex-col gap-1.5 rounded-md border border-borde p-2">
              {processes.map((p) => (
                <Label key={p.id} className="flex items-center gap-2 font-normal">
                  <Checkbox checked={procIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                  {p.code}
                </Label>
              ))}
              {processes.length === 0 && <span className="text-caption text-texto-sec">No hay procesos en la organización.</span>}
            </div>
          </div>
          <div className={field}>
            <Label>Líder auditor (opcional)</Label>
            <Select value={lead} onValueChange={setLead}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo con rol auditor" />
              </SelectTrigger>
              <SelectContent>
                {auditors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="aud-date">Fecha planificada</Label>
            <input
              id="aud-date"
              type="date"
              value={plannedDate}
              min={today()}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
            />
          </div>
        </div>

        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Planificar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
