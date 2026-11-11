"use client"

import { ClipboardCheckIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createScar } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type SupplierOption = { id: string; name: string }

/** Emite un SCAR desde una NC, eligiendo el proveedor y ligando la NC. */
export function IssueScarButton({ ncId, ncTitle, ncDescription, suppliers }: { ncId: string; ncTitle: string; ncDescription: string; suppliers: SupplierOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "")
  const [title, setTitle] = useState(ncTitle)
  const [description, setDescription] = useState(ncDescription)
  const [dueDays, setDueDays] = useState("15")

  function submit() {
    if (!supplierId) { toast.error("Elige el proveedor."); return }
    if (title.trim().length < 3 || description.trim().length < 3) { toast.error("Completa el problema."); return }
    start(async () => {
      const r = await createScar({ supplierId, nonconformityId: ncId, title: title.trim(), description: description.trim(), dueDays: Number(dueDays) || 15 })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`SCAR ${r.data.code} emitido. Compártelo desde la ficha del proveedor.`)
      setOpen(false)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" disabled={suppliers.length === 0}><ClipboardCheckIcon /> Emitir SCAR</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Emitir SCAR al proveedor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="is-sup">Proveedor</Label>
            <select id="is-sup" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={select}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className={field}><Label htmlFor="is-title">Título del problema</Label><Input id="is-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className={field}><Label htmlFor="is-desc">Descripción</Label><Textarea id="is-desc" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className={field}><Label htmlFor="is-due">Plazo (días)</Label><Input id="is-due" type="number" min={1} max={365} value={dueDays} onChange={(e) => setDueDays(e.target.value)} className="w-28" /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Emitir SCAR</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
