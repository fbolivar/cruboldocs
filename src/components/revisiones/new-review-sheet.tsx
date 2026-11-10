"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createReview } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

/** Crear un acta de revisión (Líder SIG). El envío se conecta en la fase de backend. */
export function NewReviewSheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [meeting, setMeeting] = useState("")
  const [scope, setScope] = useState("")

  function submit() {
    if (title.trim().length < 3 || !from || !to || !meeting) {
      toast.error("Indica título, periodo y fecha de la reunión.")
      return
    }
    if (to < from) {
      toast.error("El fin del periodo no puede ser anterior al inicio.")
      return
    }
    start(async () => {
      const r = await createReview({ title, periodStart: from, periodEnd: to, meetingDate: meeting, scope: scope || undefined })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(`Acta ${r.data.code} creada.`)
      setOpen(false)
      setTitle(""); setFrom(""); setTo(""); setMeeting(""); setScope("")
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  const dateCls = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PlusIcon /> Nueva revisión</Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Nueva revisión por la dirección</SheetTitle>
          <SheetDescription>Al crearla se precargan los datos del sistema del periodo; podrás editarla hasta cerrarla.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="rev-title">Título</Label>
            <Input id="rev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Revisión por la dirección 2026-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="rev-from">Periodo — desde</Label>
              <input id="rev-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
            </div>
            <div className={field}>
              <Label htmlFor="rev-to">Periodo — hasta</Label>
              <input id="rev-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={dateCls} />
            </div>
          </div>
          <div className={field}>
            <Label htmlFor="rev-meeting">Fecha de la reunión</Label>
            <input id="rev-meeting" type="date" value={meeting} onChange={(e) => setMeeting(e.target.value)} className={dateCls} />
          </div>
          <div className={field}>
            <Label htmlFor="rev-scope">Alcance / propósito (opcional)</Label>
            <Textarea id="rev-scope" rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit} loading={pending}>Crear acta</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
