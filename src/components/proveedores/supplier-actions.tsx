"use client"

import { PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CRITICALITY_LABELS, KIND_LABELS } from "@/components/proveedores/labels"
import { setSupplierActive, updateSupplier } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { SupplierCriticality, SupplierDetail, SupplierKind } from "@/lib/types"

const KINDS = Object.keys(KIND_LABELS) as SupplierKind[]
const CRITS = Object.keys(CRITICALITY_LABELS) as SupplierCriticality[]

/** Editar datos y dar de baja / reactivar. Stubs; backend. */
export function SupplierActions({ supplier }: { supplier: SupplierDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function toggleActive() {
    start(async () => {
      const r = await setSupplierActive(supplier.id, !supplier.isActive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(supplier.isActive ? "Proveedor dado de baja." : "Proveedor reactivado.")
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap gap-2">
      <EditSupplierSheet supplier={supplier} />
      <Button variant={supplier.isActive ? "outline" : "default"} size="sm" onClick={toggleActive} loading={pending}>
        {supplier.isActive ? "Dar de baja" : "Reactivar"}
      </Button>
    </div>
  )
}

function EditSupplierSheet({ supplier }: { supplier: SupplierDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(supplier.name)
  const [nit, setNit] = useState(supplier.nit ?? "")
  const [kind, setKind] = useState<SupplierKind>(supplier.kind)
  const [category, setCategory] = useState(supplier.category ?? "")
  const [criticality, setCriticality] = useState<SupplierCriticality>(supplier.criticality)
  const [contactName, setContactName] = useState(supplier.contactName ?? "")
  const [contactEmail, setContactEmail] = useState(supplier.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(supplier.contactPhone ?? "")

  function submit() {
    if (name.trim().length < 2) { toast.error("Escribe la razón social."); return }
    start(async () => {
      const r = await updateSupplier(supplier.id, {
        name, nit: nit.trim() || undefined, kind, category: category.trim() || undefined, criticality,
        contactName: contactName.trim() || undefined, contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Proveedor actualizado.")
      setOpen(false)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><PencilIcon /> Editar</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar proveedor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="ed-name">Razón social</Label><Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="ed-nit">NIT</Label><Input id="ed-nit" value={nit} onChange={(e) => setNit(e.target.value)} /></div>
            <div className={field}>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as SupplierKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="ed-cat">Categoría</Label><Input id="ed-cat" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div className={field}>
              <Label>Criticidad</Label>
              <Select value={criticality} onValueChange={(v) => setCriticality(v as SupplierCriticality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRITS.map((c) => <SelectItem key={c} value={c}>{CRITICALITY_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}>
            <Label htmlFor="ed-cn">Contacto</Label>
            <Input id="ed-cn" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre" />
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Correo" type="email" />
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Teléfono" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
