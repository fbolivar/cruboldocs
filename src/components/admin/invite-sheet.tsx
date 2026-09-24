"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormSheet } from "@/components/admin/form-sheet"
import { OptionSelect, type Option } from "@/components/admin/option-select"
import { SwitchField } from "@/components/admin/switch-field"
import { emailError, fromDateInput, validUntilError } from "@/components/admin/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { inviteUser } from "@/lib/data/actions"
import { todayIsoDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Errors = Partial<Record<"email" | "position" | "validUntil", string>>
const EMPTY = { email: "", positionId: "", isExternal: false, validUntil: "", isOrgAdmin: false }

export function InviteSheet({ positions, className }: { positions: Option[]; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()
  const set = (changes: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...changes }))

  function submit() {
    const next: Errors = {
      email: emailError(form.email) ?? undefined,
      position: form.positionId ? undefined : "Elige el cargo que tendrá la persona.",
      validUntil: form.isExternal ? (validUntilError(form.validUntil) ?? undefined) : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    startTransition(async () => {
      const email = form.email.trim().toLowerCase()
      const res = await inviteUser({
        email,
        positionId: form.positionId,
        isExternal: form.isExternal,
        validUntil: form.isExternal ? fromDateInput(form.validUntil) : null,
        isOrgAdmin: form.isOrgAdmin,
      })
      if (!res.ok) {
        if (res.error.includes("correo")) setErrors({ email: res.error })
        else toast.error(res.error)
        return
      }
      toast.success(`Invitación enviada a ${email}`)
      setForm(EMPTY)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button className={cn("w-full md:w-auto", className)} onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" />
        Invitar usuario
      </Button>
      <FormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setErrors({})
        }}
        title="Invitar usuario"
        description="Le enviaremos un correo para que cree su contraseña. Sus permisos salen del cargo."
        submitLabel="Enviar invitación"
        pending={pending}
        onSubmit={submit}
      >
        <Field id="inv-correo" label="Correo" required error={errors.email}>
          {(aria) => (
            <Input {...aria} type="email" autoComplete="off" placeholder="nombre@empresa.co" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          )}
        </Field>
        <Field
          id="inv-cargo"
          label="Cargo"
          required
          error={errors.position}
          help={positions.length === 0 ? "Primero crea un cargo en la pestaña Cargos y roles." : undefined}
        >
          {(aria) => <OptionSelect aria={aria} options={positions} placeholder="Elige un cargo" value={form.positionId} onChange={(positionId) => set({ positionId })} />}
        </Field>
        <SwitchField
          id="inv-externo"
          label="Externo"
          help="Auditores, consultores o contratistas. Su acceso vence en la fecha que indiques."
          checked={form.isExternal}
          onCheckedChange={(isExternal) => set({ isExternal })}
        />
        {form.isExternal && (
          <Field id="inv-vigencia" label="Vigencia hasta" required error={errors.validUntil}>
            {(aria) => <Input {...aria} type="date" min={todayIsoDate()} value={form.validUntil} onChange={(e) => set({ validUntil: e.target.value })} />}
          </Field>
        )}
        <SwitchField
          id="inv-admin"
          label="Es administrador de la organización"
          help="Solo metadatos; no ve el contenido de los documentos"
          checked={form.isOrgAdmin}
          onCheckedChange={(isOrgAdmin) => set({ isOrgAdmin })}
        />
      </FormSheet>
    </>
  )
}
