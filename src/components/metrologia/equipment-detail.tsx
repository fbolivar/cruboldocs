"use client"

import { Ban, DownloadIcon, PencilIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CalibrationResultBadge } from "@/components/metrologia/badges"
import { CALIBRATION_KIND_LABELS, FREQUENCY_LABELS } from "@/components/metrologia/labels"
import { exportCalibrationsCsv, registerCalibration, setEquipmentService, updateEquipment } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { WrenchIcon } from "lucide-react"
import type { CalibrationView, EquipmentDetail, MetrologyFrequency } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
const FREQS = Object.keys(FREQUENCY_LABELS) as MetrologyFrequency[]

export function ExportCalibrationsCsvButton({ code }: { code: string }) {
  const [pending, start] = useTransition()
  return <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => {
    try { downloadCsv(`${code}-calibraciones-${todayIsoDate()}.csv`, await exportCalibrationsCsv(code)) } catch { toast.error("No pudimos exportar el CSV.") }
  })}><DownloadIcon /> Exportar CSV</Button>
}

export function CalibrationList({ items }: { items: CalibrationView[] }) {
  if (items.length === 0) return <EmptyState icon={WrenchIcon} title="Aún sin calibraciones" description="Registra la primera calibración o verificación." />
  return (
    <ul className="divide-y divide-borde">
      {items.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body">{c.date}</span>
            <span className="text-caption text-texto-sec">· {CALIBRATION_KIND_LABELS[c.kind]}</span>
            <CalibrationResultBadge result={c.result} />
          </div>
          <p className="text-caption text-texto-sec">
            {c.standardUsed ? `Patrón: ${c.standardUsed} · ` : ""}{c.certificateRef ? `Cert: ${c.certificateRef} · ` : ""}
            {c.provider ? `${c.provider} · ` : ""}{c.nextDueDate ? `Próxima: ${c.nextDueDate}` : ""}
          </p>
          {c.note && <p className="text-caption text-texto-sec">{c.note}</p>}
        </li>
      ))}
    </ul>
  )
}

export function RegisterCalibrationSheet({ equipmentId }: { equipmentId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({ date: todayIsoDate(), kind: "calibracion", result: "conforme", standard: "", certificate: "", provider: "", note: "" })
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }))

  function submit() {
    if (!s.date) { toast.error("Indica la fecha."); return }
    start(async () => {
      const r = await registerCalibration(equipmentId, s)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Calibración registrada."); setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Registrar calibración</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Registrar calibración</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="cal-date">Fecha</Label><input id="cal-date" type="date" value={s.date} onChange={(e) => set("date", e.target.value)} className={dateInput} /></div>
            <div className={field}><Label>Tipo</Label>
              <Select value={s.kind} onValueChange={(v) => set("kind", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="calibracion">Calibración</SelectItem><SelectItem value="verificacion">Verificación</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label>Resultado</Label>
            <Select value={s.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="conforme">Conforme</SelectItem><SelectItem value="ajustado">Ajustado</SelectItem><SelectItem value="no_conforme">No conforme</SelectItem></SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="cal-std">Patrón usado (opc.)</Label><Input id="cal-std" value={s.standard} onChange={(e) => set("standard", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="cal-cert">Certificado (opc.)</Label><Input id="cal-cert" value={s.certificate} onChange={(e) => set("certificate", e.target.value)} /></div>
            <div className={field}><Label htmlFor="cal-prov">Proveedor (opc.)</Label><Input id="cal-prov" value={s.provider} onChange={(e) => set("provider", e.target.value)} /></div>
          </div>
          <div className={field}><Label htmlFor="cal-note">Nota (opc.)</Label><Textarea id="cal-note" rows={2} value={s.note} onChange={(e) => set("note", e.target.value)} /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar calibración</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function EquipmentHeaderActions({ equipment, processes, positions }: { equipment: EquipmentDetail; processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({
    name: equipment.name, type: equipment.type ?? "", processId: equipment.processId ?? "", location: equipment.location ?? "",
    range: equipment.measurementRange ?? "", unit: equipment.unit ?? "", frequency: equipment.frequency, responsibleId: "",
  })
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }))
  if (!equipment.canManage) return null

  function save() {
    if (s.name.trim().length < 2) { toast.error("El nombre es obligatorio."); return }
    start(async () => {
      const r = await updateEquipment(equipment.id, { name: s.name, type: s.type || undefined, processId: s.processId || null, location: s.location || undefined, range: s.range || undefined, unit: s.unit || undefined, frequency: s.frequency, responsibleId: s.responsibleId || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Equipo actualizado."); setOpen(false); router.refresh()
    })
  }
  function toggle() {
    const inService = equipment.status === "fuera_de_servicio"
    start(async () => {
      const r = await setEquipmentService(equipment.id, inService)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(inService ? "Equipo reactivado." : "Equipo dado de baja."); router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {equipment.status !== "fuera_de_servicio" && <RegisterCalibrationSheet equipmentId={equipment.id} />}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
        <SheetContent size="sm" className="gap-0 p-0">
          <SheetHeader className="border-b border-borde"><SheetTitle>Editar equipo</SheetTitle></SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className={field}><Label htmlFor="ee-name">Nombre</Label><Input id="ee-name" value={s.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}><Label htmlFor="ee-type">Tipo</Label><Input id="ee-type" value={s.type} onChange={(e) => set("type", e.target.value)} /></div>
              <div className={field}><Label>Proceso</Label>
                <Select value={s.processId || "none"} onValueChange={(v) => set("processId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">(sin proceso)</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}><Label htmlFor="ee-range">Rango</Label><Input id="ee-range" value={s.range} onChange={(e) => set("range", e.target.value)} /></div>
              <div className={field}><Label htmlFor="ee-unit">Unidad</Label><Input id="ee-unit" value={s.unit} onChange={(e) => set("unit", e.target.value)} /></div>
            </div>
            <div className={field}><Label htmlFor="ee-loc">Ubicación</Label><Input id="ee-loc" value={s.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}><Label>Frecuencia</Label>
                <Select value={s.frequency} onValueChange={(v) => set("frequency", v as MetrologyFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className={field}><Label>Responsable</Label>
                <Select value={s.responsibleId || "none"} onValueChange={(v) => set("responsibleId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">(sin cambio)</SelectItem>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>Guardar cambios</Button></SheetFooter>
        </SheetContent>
      </Sheet>
      <Button variant="outline" size="sm" onClick={toggle} loading={pending}>
        {equipment.status === "fuera_de_servicio" ? <><RotateCcwIcon className="size-4" /> Reactivar</> : <><Ban className="size-4" /> Dar de baja</>}
      </Button>
    </div>
  )
}
