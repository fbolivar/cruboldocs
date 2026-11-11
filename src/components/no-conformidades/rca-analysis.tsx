"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { saveRcaAnalysis, setNcCause } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { FiveWhysData, IshikawaData, RcaAnalysisView, RcaMethod } from "@/lib/types"

const CATS: { key: keyof IshikawaData["categories"]; label: string }[] = [
  { key: "metodo", label: "Método" }, { key: "maquina", label: "Máquina" }, { key: "mano_obra", label: "Mano de obra" },
  { key: "material", label: "Material" }, { key: "medio", label: "Medio" }, { key: "medicion", label: "Medición" },
]
const emptyIsh = (): IshikawaData => ({ categories: { metodo: [], maquina: [], mano_obra: [], material: [], medio: [], medicion: [] } })

export function RcaAnalysis({ ncId, cause, rca, canManage }: { ncId: string; cause: string | null; rca: RcaAnalysisView | null; canManage: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [method, setMethod] = useState<RcaMethod>(rca?.method ?? "5porques")
  const [five, setFive] = useState<FiveWhysData>(rca?.method === "5porques" ? (rca.data as FiveWhysData) : { problem: "", steps: [""] })
  const [ish, setIsh] = useState<IshikawaData>(rca?.method === "ishikawa" ? (rca.data as IshikawaData) : emptyIsh())
  const [conclusion, setConclusion] = useState(rca?.conclusion ?? "")

  if (!canManage && !rca) return <p className="text-small text-texto-sec">Sin análisis estructurado.</p>

  function save() {
    const data = method === "5porques"
      ? { problem: five.problem.trim(), steps: five.steps.map((s) => s.trim()).filter(Boolean) }
      : { categories: Object.fromEntries(CATS.map((c) => [c.key, ish.categories[c.key].map((x) => x.trim()).filter(Boolean)])) }
    const empty = method === "5porques" ? (data as FiveWhysData).steps.length === 0 : CATS.every((c) => (ish.categories[c.key] ?? []).filter((x) => x.trim()).length === 0)
    if (empty) { toast.error("Agrega al menos un elemento al análisis."); return }
    start(async () => {
      const r = await saveRcaAnalysis({ ncId, method, data, conclusion: conclusion.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Análisis guardado.")
      router.refresh()
    })
  }
  function useAsCause() {
    const text = conclusion.trim() || (method === "5porques" ? five.steps.map((s) => s.trim()).filter(Boolean).at(-1) ?? "" : "")
    if (text.length < 5) { toast.error("Escribe la conclusión (causa raíz)."); return }
    if (cause && !confirm("Ya hay una causa raíz. ¿Reemplazarla con la conclusión del análisis?")) return
    start(async () => {
      const r = await setNcCause(ncId, text)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Causa raíz actualizada.")
      router.refresh()
    })
  }

  const readOnly = !canManage
  const seg = (m: RcaMethod, label: string) => (
    <button type="button" disabled={readOnly} onClick={() => setMethod(m)}
      className={`rounded-md px-3 py-1.5 text-small ${method === m ? "bg-acento text-superficie" : "bg-superficie-alt text-texto-sec"}`}>{label}</button>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">{seg("5porques", "5 Porqués")}{seg("ishikawa", "Ishikawa (6M)")}</div>

      {method === "5porques" ? (
        <div className="flex flex-col gap-2">
          <Input value={five.problem} disabled={readOnly} maxLength={1000} onChange={(e) => setFive((f) => ({ ...f, problem: e.target.value }))} placeholder="Problema (qué ocurrió)" />
          {five.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-caption text-texto-sec">{i + 1}.</span>
              <Input value={s} disabled={readOnly} maxLength={1000} onChange={(e) => setFive((f) => ({ ...f, steps: f.steps.map((x, idx) => idx === i ? e.target.value : x) }))} placeholder="¿Por qué?" />
              {!readOnly && five.steps.length > 1 && <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => setFive((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))}><XIcon /></Button>}
            </div>
          ))}
          {!readOnly && five.steps.length < 12 && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setFive((f) => ({ ...f, steps: [...f.steps, ""] }))}><PlusIcon /> Añadir porqué</Button>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {CATS.map((c) => (
            <IshikawaRow key={c.key} label={c.label} items={ish.categories[c.key]} readOnly={readOnly}
              onAdd={(v) => setIsh((s) => ({ categories: { ...s.categories, [c.key]: [...s.categories[c.key], v] } }))}
              onRemove={(idx) => setIsh((s) => ({ categories: { ...s.categories, [c.key]: s.categories[c.key].filter((_, i) => i !== idx) } }))}
              onPick={(v) => setConclusion(v)} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-caption font-medium text-texto-sec">Conclusión (causa raíz identificada)</label>
        <Textarea rows={2} value={conclusion} disabled={readOnly} maxLength={2000} onChange={(e) => setConclusion(e.target.value)} placeholder="La causa raíz, en una o dos frases" />
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} loading={pending}>Guardar análisis</Button>
          <Button size="sm" variant="outline" onClick={useAsCause} loading={pending}>Usar como causa raíz</Button>
        </div>
      )}
    </div>
  )
}

function IshikawaRow({ label, items, readOnly, onAdd, onRemove, onPick }: {
  label: string; items: string[]; readOnly: boolean
  onAdd: (v: string) => void; onRemove: (i: number) => void; onPick: (v: string) => void
}) {
  const [val, setVal] = useState("")
  return (
    <div className="flex flex-col gap-1 rounded-md border border-borde p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-medium text-texto">{label}</span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Input value={val} maxLength={500} onChange={(e) => setVal(e.target.value)} placeholder="Causa posible" className="h-8 w-48" />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Añadir causa" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal("") } }}><PlusIcon /></Button>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <button type="button" disabled={readOnly} onClick={() => onPick(it)} title="Marcar como causa raíz"><Chip>{it}</Chip></button>
              {!readOnly && <button type="button" aria-label="Quitar" onClick={() => onRemove(i)} className="text-texto-sec"><XIcon className="size-3.5" /></button>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
