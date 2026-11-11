"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cancelScar, createScar, reviewScar } from "@/lib/data/actions"
import { CopyLinkField } from "@/components/portal/copy-link-field"
import { ScarStatusBadge } from "@/components/scar/scar-badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardCheckIcon } from "lucide-react"
import { formatDate } from "@/lib/format"
import type { ScarView } from "@/lib/types"

function EmitSheet({ supplierId }: { supplierId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDays, setDueDays] = useState("15")

  function submit() {
    if (title.trim().length < 3 || description.trim().length < 3) { toast.error("Completa el problema."); return }
    start(async () => {
      const r = await createScar({ supplierId, title: title.trim(), description: description.trim(), dueDays: Number(dueDays) || 15 })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`SCAR ${r.data.code} emitido.`)
      setOpen(false); setTitle(""); setDescription("")
      router.refresh()
    })
  }
  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Emitir SCAR</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Emitir SCAR</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="sc-title">Título del problema</Label><Input id="sc-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className={field}>
            <Label htmlFor="sc-desc">Descripción</Label>
            <Textarea id="sc-desc" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="text-caption text-texto-sec">No incluyas datos de clientes.</p>
          </div>
          <div className={field}><Label htmlFor="sc-due">Plazo (días)</Label><Input id="sc-due" type="number" min={1} max={365} value={dueDays} onChange={(e) => setDueDays(e.target.value)} className="w-28" /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Emitir</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function RejectSheet({ scarId }: { scarId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  function submit() {
    start(async () => {
      const r = await reviewScar(scarId, false, notes.trim() || undefined)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("SCAR rechazado; el proveedor puede corregir.")
      setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm" variant="outline">Rechazar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Rechazar SCAR</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5"><Label htmlFor="sc-notes">Motivo / qué falta</Label><Textarea id="sc-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <p className="text-caption text-texto-sec">El SCAR vuelve a «enviada»; el proveedor corrige con el mismo enlace.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button variant="destructive" onClick={submit} loading={pending}>Rechazar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ScarRow({ scar, baseUrl, canManage }: { scar: ScarView; baseUrl: string; canManage: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [origin] = useState(() => baseUrl || (typeof window !== "undefined" ? window.location.origin : ""))
  const open = scar.status === "enviada" || scar.status === "respondida"
  const link = `${origin}/scar/${scar.token}`

  function accept() {
    start(async () => { const r = await reviewScar(scar.id, true); if (!r.ok) { toast.error(r.error); return } toast.success("SCAR aceptado."); router.refresh() })
  }
  function cancel() {
    start(async () => { const r = await cancelScar(scar.id); if (!r.ok) { toast.error(r.error); return } toast.success("SCAR anulado."); router.refresh() })
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-borde bg-superficie p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption text-texto-sec">{scar.code}</span>
          <ScarStatusBadge status={scar.status} />
          {scar.ncCode && <span className="text-caption text-texto-sec">· {scar.ncCode}</span>}
          {scar.reopenedCount > 0 && <span className="text-caption text-texto-sec">· reabierto {scar.reopenedCount}×</span>}
        </div>
        {scar.dueDate && <span className="text-caption text-texto-sec">Plazo {formatDate(scar.dueDate)}</span>}
      </div>
      <p className="text-body text-texto">{scar.title}</p>
      {scar.rootCause && (
        <div className="rounded-md bg-fondo p-2 text-small">
          <p className="text-texto-sec">Respuesta del proveedor:</p>
          <p className="mt-1 whitespace-pre-wrap text-texto"><span className="font-medium">Causa raíz:</span> {scar.rootCause}</p>
          <p className="mt-1 whitespace-pre-wrap text-texto"><span className="font-medium">Acciones:</span> {scar.actions}</p>
          {scar.commitDate && <p className="mt-1 text-texto-sec">Fecha compromiso: {formatDate(scar.commitDate)}</p>}
        </div>
      )}
      {scar.reviewNotes && <p className="text-caption text-texto-sec">Nota de revisión: {scar.reviewNotes}</p>}
      {canManage && open && <CopyLinkField link={link} />}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {scar.status === "respondida" && <Button size="sm" onClick={accept} loading={pending}>Aceptar</Button>}
          {scar.status === "respondida" && <RejectSheet scarId={scar.id} />}
          {open && <Button size="sm" variant="ghost" onClick={cancel} loading={pending}>Anular</Button>}
        </div>
      )}
    </li>
  )
}

export function ScarPanel({ supplierId, scars, canManage, baseUrl }: { supplierId: string; scars: ScarView[]; canManage: boolean; baseUrl: string }) {
  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-small text-texto-sec">Pide acción correctiva al proveedor y sigue su respuesta.</p>
          <EmitSheet supplierId={supplierId} />
        </div>
      )}
      {scars.length === 0 ? (
        <EmptyState icon={ClipboardCheckIcon} title="Sin SCAR para este proveedor" description="Emite el primero cuando haya una no conformidad del proveedor." />
      ) : (
        <ul className="flex flex-col gap-2">
          {scars.map((s) => <ScarRow key={s.id} scar={s} baseUrl={baseUrl} canManage={canManage} />)}
        </ul>
      )}
    </div>
  )
}
