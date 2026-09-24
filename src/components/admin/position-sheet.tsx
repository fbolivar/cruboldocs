"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormSheet } from "@/components/admin/form-sheet"
import { OptionSelect, type Option } from "@/components/admin/option-select"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { savePosition } from "@/lib/data/actions"

const NONE = "ninguno"

/** "Crear cargo": nombre y proceso; los roles se asignan después en el detalle. */
export function PositionSheet({ processes }: { processes: Option[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [processId, setProcessId] = useState(NONE)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!name.trim()) return setError("Escribe el nombre del cargo, p. ej. Líder de Compras.")
    setError(null)
    startTransition(async () => {
      const res = await savePosition({ name: name.trim(), processId: processId === NONE ? null : processId, roles: [] })
      if (!res.ok) return setError(res.error)
      toast.success(`Cargo ${name.trim()} creado. Ahora asígnale roles.`)
      setName("")
      setProcessId(NONE)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button className="w-full md:w-auto" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" />
        Crear cargo
      </Button>
      <FormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setError(null)
        }}
        title="Crear cargo"
        description="Los permisos se asignan al cargo; las personas que lo ocupen los heredan."
        submitLabel="Crear cargo"
        pending={pending}
        onSubmit={submit}
      >
        <Field id="cargo-nombre" label="Nombre" required error={error}>
          {(aria) => <Input {...aria} value={name} onChange={(e) => setName(e.target.value)} placeholder="Líder de Compras" />}
        </Field>
        <Field id="cargo-proceso" label="Proceso" help="El proceso al que pertenece el cargo en el organigrama.">
          {(aria) => (
            <OptionSelect aria={aria} options={[{ value: NONE, label: "Sin proceso" }, ...processes]} value={processId} onChange={setProcessId} />
          )}
        </Field>
      </FormSheet>
    </>
  )
}
