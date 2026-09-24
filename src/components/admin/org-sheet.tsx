"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { type InvitationLink, InvitationLinkDialog } from "@/components/admin/invitation-link-dialog"
import { FormSheet } from "@/components/admin/form-sheet"
import { emailError, nitError } from "@/components/admin/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createOrganization } from "@/lib/data/actions"

type Errors = Partial<Record<"name" | "nit" | "adminEmail", string>>
const EMPTY = { name: "", nit: "", adminEmail: "" }

/** "Crear organización" (Superadmin): nombre, NIT y correo del Administrador inicial. */
export function OrgSheet() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [shareLink, setShareLink] = useState<InvitationLink | null>(null)
  const [pending, startTransition] = useTransition()
  const set = (changes: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...changes }))

  function submit() {
    const mail = emailError(form.adminEmail)
    const next: Errors = {
      name: form.name.trim() ? undefined : "Escribe la razón social, p. ej. Acme S.A.S.",
      nit: nitError(form.nit) ?? undefined,
      adminEmail: mail ? mail.replace("de la persona", "del administrador") : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    startTransition(async () => {
      const email = form.adminEmail.trim().toLowerCase()
      const res = await createOrganization({ name: form.name.trim(), nit: form.nit.trim(), adminEmail: email })
      if (!res.ok) {
        if (res.error.includes("NIT")) setErrors({ nit: res.error })
        else toast.error(res.error)
        return
      }
      if (res.data.link) {
        toast.success(`Organización ${form.name.trim()} creada`)
        setShareLink({ email, link: res.data.link })
      } else toast.success(`Organización ${form.name.trim()} creada. Enviamos la invitación a ${email}`)
      setForm(EMPTY)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button className="w-full md:w-auto" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" />
        Crear organización
      </Button>
      <FormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setErrors({})
        }}
        title="Crear organización"
        description="El Administrador inicial recibirá una invitación para configurarla. Tú no verás el contenido de sus documentos."
        submitLabel="Crear organización"
        pending={pending}
        onSubmit={submit}
      >
        <Field id="org-nombre" label="Nombre" required error={errors.name}>
          {(aria) => <Input {...aria} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Acme S.A.S." />}
        </Field>
        <Field id="org-nit" label="NIT" required error={errors.nit} help={errors.nit ? undefined : "9 dígitos, guion y dígito de verificación."}>
          {(aria) => (
            <Input {...aria} className="font-mono" inputMode="numeric" maxLength={11} value={form.nit} onChange={(e) => set({ nit: e.target.value })} placeholder="900123456-7" />
          )}
        </Field>
        <Field id="org-admin" label="Correo del Administrador inicial" required error={errors.adminEmail}>
          {(aria) => (
            <Input {...aria} type="email" autoComplete="off" value={form.adminEmail} onChange={(e) => set({ adminEmail: e.target.value })} placeholder="admin@empresa.co" />
          )}
        </Field>
      </FormSheet>
      <InvitationLinkDialog invite={shareLink} onClose={() => setShareLink(null)} />
    </>
  )
}
