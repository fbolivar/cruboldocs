"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createMinute, exportMinutesCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type ProcessOption = { id: string; name: string }

export function ExportMinutesButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        const csv = await exportMinutesCsv()
        downloadCsv(`actas-${todayIsoDate()}.csv`, csv)
      } catch {
        toast.error("No pudimos exportar el CSV.")
      }
    })
  }
  return (
    <Button variant="outline" onClick={run} loading={pending}>
      <DownloadIcon /> Exportar CSV
    </Button>
  )
}

export function NewMinuteSheet({ processes }: { processes: ProcessOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("comité")
  const [date, setDate] = useState("")
  const [processId, setProcessId] = useState("")
  const [attendees, setAttendees] = useState("")
  const [agenda, setAgenda] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("Indica el título del acta."); return }
    if (!date) { toast.error("Indica la fecha de la reunión."); return }
    start(async () => {
      const r = await createMinute({
        title, meetingType: type, meetingDate: date,
        processId: processId || null, attendees: attendees.trim() || undefined, agenda: agenda.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Acta ${r.data.code} creada.`)
      setOpen(false)
      setTitle(""); setType("comité"); setDate(""); setProcessId(""); setAttendees(""); setAgenda("")
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PlusIcon /> Nueva acta</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva acta</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="ac-title">Título</Label>
            <Input id="ac-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Revisión mensual del SIG" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label>Tipo de reunión</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comité">Comité</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label htmlFor="ac-date">Fecha</Label>
              <input id="ac-date" type="date" max={todayIsoDate()} value={date} onChange={(e) => setDate(e.target.value)} className={dateInput} />
            </div>
          </div>
          <div className={field}>
            <Label>Proceso (opcional)</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                {processes.length === 0
                  ? <SelectItem value="none" disabled>(sin procesos)</SelectItem>
                  : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="ac-att">Asistentes (opcional)</Label>
            <Textarea id="ac-att" rows={2} value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Nombres de los asistentes" />
            <p className="text-caption text-texto-sec">Dato personal: registra solo los nombres necesarios para dejar constancia.</p>
          </div>
          <div className={field}>
            <Label htmlFor="ac-agenda">Temas / orden del día (opcional)</Label>
            <Textarea id="ac-agenda" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear acta</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
