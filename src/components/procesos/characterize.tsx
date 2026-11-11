"use client"

import { PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateProcessCharacterization } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { FileTextIcon } from "lucide-react"
import type { ProcessCharacterization } from "@/lib/types"

const field = "flex flex-col gap-1.5"

const PAIRS: { key: keyof ProcessCharacterization; label: string }[] = [
  { key: "objective", label: "Objetivo" },
  { key: "scope", label: "Alcance" },
  { key: "inputs", label: "Entradas" },
  { key: "suppliers", label: "Proveedores" },
  { key: "outputs", label: "Salidas" },
  { key: "clients", label: "Clientes" },
  { key: "resources", label: "Recursos" },
]
const PHVA: { key: keyof ProcessCharacterization; label: string }[] = [
  { key: "phvaPlan", label: "Planear" },
  { key: "phvaDo", label: "Hacer" },
  { key: "phvaCheck", label: "Verificar" },
  { key: "phvaAct", label: "Actuar" },
]

function CharacterizeSheet({
  processId, current, open, onOpenChange,
}: {
  processId: string
  current: ProcessCharacterization
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [form, setForm] = useState<ProcessCharacterization>(current)
  const set = (k: keyof ProcessCharacterization, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    start(async () => {
      const r = await updateProcessCharacterization(processId, {
        objective: form.objective ?? undefined, scope: form.scope ?? undefined, inputs: form.inputs ?? undefined,
        suppliers: form.suppliers ?? undefined, outputs: form.outputs ?? undefined, clients: form.clients ?? undefined,
        resources: form.resources ?? undefined, phvaPlan: form.phvaPlan ?? undefined, phvaDo: form.phvaDo ?? undefined,
        phvaCheck: form.phvaCheck ?? undefined, phvaAct: form.phvaAct ?? undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      onOpenChange(false)
      toast.success("Caracterización guardada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Caracterizar proceso</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="c-obj">Objetivo</Label>
            <Textarea id="c-obj" rows={2} value={form.objective ?? ""} onChange={(e) => set("objective", e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="c-scope">Alcance</Label>
            <Textarea id="c-scope" rows={2} value={form.scope ?? ""} onChange={(e) => set("scope", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={field}><Label htmlFor="c-in">Entradas</Label>
              <Textarea id="c-in" rows={2} value={form.inputs ?? ""} onChange={(e) => set("inputs", e.target.value)} />
            </div>
            <div className={field}><Label htmlFor="c-sup">Proveedores</Label>
              <Input id="c-sup" value={form.suppliers ?? ""} onChange={(e) => set("suppliers", e.target.value)} />
            </div>
            <div className={field}><Label htmlFor="c-out">Salidas</Label>
              <Textarea id="c-out" rows={2} value={form.outputs ?? ""} onChange={(e) => set("outputs", e.target.value)} />
            </div>
            <div className={field}><Label htmlFor="c-cli">Clientes</Label>
              <Input id="c-cli" value={form.clients ?? ""} onChange={(e) => set("clients", e.target.value)} />
            </div>
          </div>
          <div className={field}><Label htmlFor="c-res">Recursos</Label>
            <Textarea id="c-res" rows={2} value={form.resources ?? ""} onChange={(e) => set("resources", e.target.value)} />
          </div>
          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-small font-medium text-texto">Ciclo PHVA</legend>
            {PHVA.map((p) => (
              <div key={p.key} className={field}><Label htmlFor={`c-${p.key}`}>{p.label}</Label>
                <Textarea id={`c-${p.key}`} rows={2} value={(form[p.key] as string | null) ?? ""} onChange={(e) => set(p.key, e.target.value)} />
              </div>
            ))}
          </fieldset>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CharacterizationView({
  processId, characterization, canManage,
}: {
  processId: string
  characterization: ProcessCharacterization
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const c = characterization
  const hasAny = Object.values(c).some((v) => v != null && v !== "")
  const hasPhva = PHVA.some((p) => (c[p.key] as string | null))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h3 text-texto">Caracterización (4.4)</h2>
        {canManage && <Button variant="outline" size="sm" onClick={() => setOpen(true)}><PencilIcon /> Caracterizar</Button>}
      </div>
      {!hasAny ? (
        <EmptyState icon={FileTextIcon} title="Este proceso no tiene caracterización."
          description={canManage ? "Agrégala con «Caracterizar»." : undefined} />
      ) : (
        <dl className="divide-y divide-borde rounded-md border border-borde">
          {PAIRS.filter((p) => c[p.key]).map((p) => (
            <div key={p.key} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:gap-4">
              <dt className="w-36 shrink-0 text-small font-medium text-texto-sec">{p.label}</dt>
              <dd className="whitespace-pre-wrap text-body text-texto">{c[p.key]}</dd>
            </div>
          ))}
          {hasPhva && (
            <div className="flex flex-col gap-1 p-3 sm:flex-row sm:gap-4">
              <dt className="w-36 shrink-0 text-small font-medium text-texto-sec">PHVA</dt>
              <dd className="flex flex-col gap-1 text-body text-texto">
                {PHVA.filter((p) => c[p.key]).map((p) => (
                  <span key={p.key}><span className="text-texto-sec">{p.label}:</span> {c[p.key]}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
      {canManage && <CharacterizeSheet processId={processId} current={c} open={open} onOpenChange={setOpen} />}
    </div>
  )
}
