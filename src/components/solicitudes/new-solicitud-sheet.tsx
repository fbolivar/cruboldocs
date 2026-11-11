"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createApprovalRequest, exportSolicitudesCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ApprovalFlowOption } from "@/lib/types"

export function ExportSolicitudesButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        const csv = await exportSolicitudesCsv()
        downloadCsv(`solicitudes-${todayIsoDate()}.csv`, csv)
      } catch {
        toast.error("No pudimos exportar el CSV.")
      }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function NewSolicitudSheet({ flows }: { flows: ApprovalFlowOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [flowId, setFlowId] = useState(flows[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  function submit() {
    if (!flowId) { toast.error("Elige un flujo."); return }
    if (title.trim().length < 3) { toast.error("Ponle un título."); return }
    start(async () => {
      const r = await createApprovalRequest({ flowId, title: title.trim(), description: description.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Solicitud ${r.data.code} radicada.`)
      setOpen(false)
      setTitle(""); setDescription("")
      router.push(`/app/solicitudes/${r.data.code}`)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={flows.length === 0}><PlusIcon /> Nueva solicitud</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva solicitud</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {flows.length === 0 ? (
            <p className="text-small text-texto-sec">No hay flujos activos. Pide al Líder SIG que configure un flujo en Administración → Flujos.</p>
          ) : (
            <>
              <div className={field}>
                <Label htmlFor="so-flow">Flujo</Label>
                <select id="so-flow" value={flowId} onChange={(e) => setFlowId(e.target.value)} className={select}>
                  {flows.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.stepCount} paso{f.stepCount === 1 ? "" : "s"})</option>)}
                </select>
              </div>
              <div className={field}>
                <Label htmlFor="so-title">Título</Label>
                <Input id="so-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Compra de equipo de cómputo" />
              </div>
              <div className={field}>
                <Label htmlFor="so-desc">Descripción</Label>
                <Textarea id="so-desc" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending} disabled={flows.length === 0}>Radicar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
