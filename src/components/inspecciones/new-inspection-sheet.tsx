"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { CriterionDot } from "@/components/inspecciones/badges"
import { criterionText, DISPOSITION_LABELS, INSPECTION_TYPE_LABELS } from "@/components/inspecciones/labels"
import { createInspection, exportInspectionsCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { InspectionDisposition, InspectionPlanOption, InspectionType } from "@/lib/types"

type Option = { id: string; name: string }
const TYPES = Object.keys(INSPECTION_TYPE_LABELS) as InspectionType[]
const DISPS = Object.keys(DISPOSITION_LABELS) as InspectionDisposition[]

export function ExportInspectionsButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        downloadCsv(`inspecciones-${todayIsoDate()}.csv`, await exportInspectionsCsv())
      } catch {
        toast.error("No pudimos exportar el CSV.")
      }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

/** El resultado cumple si el valor está en rango (numérico) o si pasa (pasa/falla). */
function resultOk(c: InspectionPlanOption["characteristics"][number], value: string, passed: boolean): boolean {
  if (c.type === "pasa_falla") return passed
  if (value.trim() === "") return false
  const n = Number(value)
  if (!Number.isFinite(n)) return false
  if (c.min !== null && c.min !== undefined && n < c.min) return false
  if (c.max !== null && c.max !== undefined && n > c.max) return false
  return true
}

export function NewInspectionSheet({ plans, suppliers }: { plans: InspectionPlanOption[]; suppliers: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [planId, setPlanId] = useState("")
  const [type, setType] = useState<InspectionType>("recepcion")
  const [supplierId, setSupplierId] = useState("")
  const [lotRef, setLotRef] = useState("")
  const [lotSize, setLotSize] = useState("")
  const [sampleSize, setSampleSize] = useState("")
  const [acceptance, setAcceptance] = useState("")
  const [defects, setDefects] = useState("")
  const [disposition, setDisposition] = useState<InspectionDisposition>("aceptado")
  const [values, setValues] = useState<Record<string, string>>({})
  const [passes, setPasses] = useState<Record<string, boolean>>({})

  const plan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId])

  // Sugerencia de disposición: si alguna característica no cumple o hay más defectos que Ac → rechazado.
  const suggestion = useMemo<InspectionDisposition | null>(() => {
    if (!plan) return null
    const anyFail = plan.characteristics.some((c) => !resultOk(c, values[c.name] ?? "", passes[c.name] ?? false))
    const ac = acceptance.trim() === "" ? null : Number(acceptance)
    const df = defects.trim() === "" ? 0 : Number(defects)
    const overAc = ac !== null && Number.isFinite(ac) && Number.isFinite(df) && df > ac
    return anyFail || overAc ? "rechazado" : "aceptado"
  }, [plan, values, passes, acceptance, defects])

  function reset() {
    setPlanId(""); setSupplierId(""); setLotRef(""); setLotSize(""); setSampleSize(""); setAcceptance(""); setDefects("")
    setDisposition("aceptado"); setValues({}); setPasses({})
  }

  function submit() {
    if (!plan) { toast.error("Elige un plan de inspección."); return }
    const results = plan.characteristics.map((c) => ({
      name: c.name,
      value: c.type === "numerico" && values[c.name]?.trim() ? Number(values[c.name]) : null,
      passed: c.type === "pasa_falla" ? (passes[c.name] ?? false) : null,
    }))
    start(async () => {
      const r = await createInspection({
        planId: plan.id, type,
        supplierId: type === "recepcion" && supplierId ? supplierId : null,
        processId: plan.processId ?? null,
        lotRef: lotRef.trim() || null,
        lotSize: lotSize.trim() ? Number(lotSize) : null,
        sampleSize: sampleSize.trim() ? Number(sampleSize) : null,
        acceptanceNumber: acceptance.trim() ? Number(acceptance) : null,
        defects: defects.trim() ? Number(defects) : null,
        disposition, results,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Inspección ${r.data.code} registrada.`)
      setOpen(false); reset()
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <SheetTrigger asChild><Button><PlusIcon /> Nueva inspección</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva inspección</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Plan de inspección</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Elige un plan activo" /></SelectTrigger>
              <SelectContent>
                {plans.length === 0
                  ? <SelectItem value="none" disabled>(crea un plan primero)</SelectItem>
                  : plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as InspectionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{INSPECTION_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {type === "recepcion" && (
              <div className={field}>
                <Label>Proveedor (opcional)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0
                      ? <SelectItem value="none" disabled>(sin proveedores)</SelectItem>
                      : suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className={field}>
            <Label htmlFor="ins-lot">Referencia de lote (opcional)</Label>
            <Input id="ins-lot" value={lotRef} onChange={(e) => setLotRef(e.target.value)} placeholder="Lote / OC / remisión" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={field}><Label htmlFor="ins-ls">Lote</Label><Input id="ins-ls" inputMode="numeric" value={lotSize} onChange={(e) => setLotSize(e.target.value)} /></div>
            <div className={field}><Label htmlFor="ins-ss">Muestra</Label><Input id="ins-ss" inputMode="numeric" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} /></div>
            <div className={field}><Label htmlFor="ins-ac">Ac</Label><Input id="ins-ac" inputMode="numeric" value={acceptance} onChange={(e) => setAcceptance(e.target.value)} /></div>
            <div className={field}><Label htmlFor="ins-df">Defectos</Label><Input id="ins-df" inputMode="numeric" value={defects} onChange={(e) => setDefects(e.target.value)} /></div>
          </div>

          {plan && plan.characteristics.length > 0 && (
            <div className="flex flex-col gap-3 rounded-md border border-borde p-3">
              <p className="text-caption font-medium text-texto-sec">Resultados por característica</p>
              {plan.characteristics.map((c) => {
                const ok = resultOk(c, values[c.name] ?? "", passes[c.name] ?? false)
                return (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <Label className="flex items-center justify-between gap-2">
                      <span>{c.name} <span className="font-normal text-texto-sec">· {criterionText(c)}</span></span>
                    </Label>
                    {c.type === "numerico" ? (
                      <Input inputMode="decimal" value={values[c.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))} placeholder="Valor medido" />
                    ) : (
                      <Select value={(passes[c.name] ?? false) ? "pasa" : "no"} onValueChange={(v) => setPasses((p) => ({ ...p, [c.name]: v === "pasa" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pasa">Pasa</SelectItem>
                          <SelectItem value="no">No pasa</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {((c.type === "numerico" && (values[c.name] ?? "").trim() !== "") || c.type === "pasa_falla") && <CriterionDot ok={ok} />}
                  </div>
                )
              })}
            </div>
          )}

          <div className={field}>
            <Label>Disposición</Label>
            <Select value={disposition} onValueChange={(v) => setDisposition(v as InspectionDisposition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DISPS.map((d) => <SelectItem key={d} value={d}>{DISPOSITION_LABELS[d]}</SelectItem>)}</SelectContent>
            </Select>
            {suggestion && suggestion !== disposition && (
              <button type="button" onClick={() => setDisposition(suggestion)} className="self-start text-caption font-medium text-acento hover:underline">
                Sugerencia según criterios: {DISPOSITION_LABELS[suggestion]} (aplicar)
              </button>
            )}
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Registrar inspección</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
