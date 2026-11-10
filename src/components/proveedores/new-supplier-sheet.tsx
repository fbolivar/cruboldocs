"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CRITICALITY_LABELS, KIND_LABELS } from "@/components/proveedores/labels"
import { createSupplier, exportSuppliersCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { SupplierCriticality, SupplierKind } from "@/lib/types"

type ProcessOption = { id: string; name: string }
const KINDS = Object.keys(KIND_LABELS) as SupplierKind[]
const CRITS = Object.keys(CRITICALITY_LABELS) as SupplierCriticality[]

export function ExportSuppliersButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        const csv = await exportSuppliersCsv()
        downloadCsv(`proveedores-${todayIsoDate()}.csv`, csv)
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

export function NewSupplierSheet({ processes }: { processes: ProcessOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [nit, setNit] = useState("")
  const [kind, setKind] = useState<SupplierKind>("bien")
  const [category, setCategory] = useState("")
  const [criticality, setCriticality] = useState<SupplierCriticality>("media")
  const [processId, setProcessId] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  function submit() {
    if (name.trim().length < 2) { toast.error("Escribe la razón social."); return }
    start(async () => {
      const r = await createSupplier({
        name, nit: nit.trim() || undefined, kind, category: category.trim() || undefined, criticality,
        processId: processId || null, contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined, contactPhone: contactPhone.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Proveedor ${r.data.code} registrado.`)
      setOpen(false)
      setName(""); setNit(""); setCategory(""); setProcessId(""); setContactName(""); setContactEmail(""); setContactPhone("")
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PlusIcon /> Nuevo proveedor</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo proveedor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="sp-name">Razón social</Label>
            <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="sp-nit">NIT (opcional)</Label>
              <Input id="sp-nit" value={nit} onChange={(e) => setNit(e.target.value)} />
            </div>
            <div className={field}>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as SupplierKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="sp-cat">Categoría (opcional)</Label>
              <Input id="sp-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Transporte" />
            </div>
            <div className={field}>
              <Label>Criticidad</Label>
              <Select value={criticality} onValueChange={(v) => setCriticality(v as SupplierCriticality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRITS.map((c) => <SelectItem key={c} value={c}>{CRITICALITY_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}>
            <Label>Proceso (opcional)</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso que lo usa" /></SelectTrigger>
              <SelectContent>
                {processes.length === 0
                  ? <SelectItem value="none" disabled>(procesos al conectar el backend)</SelectItem>
                  : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="sp-cn">Contacto (opcional)</Label>
            <Input id="sp-cn" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre" />
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Correo" type="email" />
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Teléfono" />
          </div>
          <p className="text-caption text-texto-sec">El proveedor nace «Pendiente»; haz su evaluación inicial desde la ficha.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Registrar proveedor</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
