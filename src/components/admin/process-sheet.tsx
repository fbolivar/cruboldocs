"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormSheet } from "@/components/admin/form-sheet"
import { PROCESS_TYPE_LABELS } from "@/components/admin/labels"
import { OptionSelect, type Option } from "@/components/admin/option-select"
import { codeError } from "@/components/admin/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { saveProcess } from "@/lib/data/actions"
import type { Process, ProcessType } from "@/lib/types"

const NONE = "ninguno"
const TYPE_OPTIONS = (Object.keys(PROCESS_TYPE_LABELS) as ProcessType[]).map((t) => ({ value: t, label: PROCESS_TYPE_LABELS[t] }))
type Errors = Partial<Record<"code" | "name", string>>

interface ProcessSheetProps {
  process?: Process
  positions: Option[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Crear o editar un proceso (código, nombre, tipo y cargo líder). */
export function ProcessSheet({ process, positions, open, onOpenChange }: ProcessSheetProps) {
  const router = useRouter()
  const initial = {
    code: process?.code ?? "",
    name: process?.name ?? "",
    type: process?.type ?? "misional",
    leader: process?.leaderPositionId ?? NONE,
  }
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()
  const set = (changes: Partial<typeof initial>) => setForm((f) => ({ ...f, ...changes }))

  function submit() {
    const next: Errors = {
      code: codeError(form.code.trim()) ?? undefined,
      name: form.name.trim() ? undefined : "Escribe el nombre del proceso, p. ej. Compras.",
    }
    setErrors(next)
    if (next.code || next.name) return
    startTransition(async () => {
      const res = await saveProcess({
        id: process?.id,
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        leaderPositionId: form.leader === NONE ? null : form.leader,
      })
      if (!res.ok) return void toast.error(res.error)
      toast.success(process ? `Proceso ${form.name.trim()} actualizado` : `Proceso ${form.name.trim()} creado`)
      if (!process) setForm(initial)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setErrors({})
      }}
      title={process ? `Editar proceso ${process.code}` : "Crear proceso"}
      description="El código forma parte del código de cada documento del proceso (p. ej. PR-GC-003)."
      submitLabel={process ? "Guardar cambios" : "Crear proceso"}
      pending={pending}
      onSubmit={submit}
    >
      <Field id="proc-codigo" label="Código" required error={errors.code} help={errors.code ? undefined : "2 o 3 letras mayúsculas."}>
        {(aria) => <Input {...aria} className="font-mono uppercase" maxLength={3} value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="GC" />}
      </Field>
      <Field id="proc-nombre" label="Nombre" required error={errors.name}>
        {(aria) => <Input {...aria} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Gestión de calidad" />}
      </Field>
      <Field id="proc-tipo" label="Tipo">
        {(aria) => <OptionSelect aria={aria} options={TYPE_OPTIONS} value={form.type} onChange={(v) => set({ type: v as ProcessType })} />}
      </Field>
      <Field id="proc-lider" label="Cargo líder" help="Quien lidera el proceso; recibe sus tareas de revisión y riesgos.">
        {(aria) => <OptionSelect aria={aria} options={[{ value: NONE, label: "Sin asignar" }, ...positions]} value={form.leader} onChange={(leader) => set({ leader })} />}
      </Field>
    </FormSheet>
  )
}

export function CreateProcessButton({ positions }: { positions: Option[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className="w-full md:w-auto" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" />
        Crear proceso
      </Button>
      <ProcessSheet positions={positions} open={open} onOpenChange={setOpen} />
    </>
  )
}
