"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type * as React from "react"
import { toast } from "sonner"

import { DataPolicyConsent } from "@/components/auth/data-policy-consent"
import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import {
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequired,
} from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { acceptInvitation } from "@/lib/data/actions"

type Key = "fullName" | "password" | "confirm" | "consent"
type Errors = Partial<Record<Key, string | null>>

const FIELD_IDS: Record<Key, string> = {
  fullName: "inv-name",
  password: "inv-password",
  confirm: "inv-confirm",
  consent: "inv-consent",
}
const CONSENT_ERROR = "Marca la casilla para aceptar el tratamiento de tus datos y continuar."
const nameError = (v: string) => validateRequired(v, "Escribe tu nombre completo.")

/** Activación de cuenta desde una invitación válida. Éxito → /app con toast de bienvenida. */
export function InvitationForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setError = (key: Key, value: string | null) => setErrors((p) => ({ ...p, [key]: value }))

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: Errors = {
      fullName: nameError(fullName),
      password: validateNewPassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
      consent: consent ? null : CONSENT_ERROR,
    }
    setErrors(next)
    const firstInvalid = (Object.keys(FIELD_IDS) as Key[]).find((k) => next[k])
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await acceptInvitation(token, { fullName: fullName.trim(), password, acceptsDataPolicy: consent })
      if (!res.ok) {
        setFormError(res.error)
        return
      }
      toast.success("Bienvenido a CrubolDocs")
      router.push("/app")
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {/* Ayuda a los gestores de contraseñas a asociar la cuenta. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <Field id={FIELD_IDS.fullName} label="Nombre completo" error={errors.fullName}>
        {(aria) => (
          <Input
            {...aria}
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => fullName && setError("fullName", nameError(fullName))}
          />
        )}
      </Field>
      <Field
        id={FIELD_IDS.password}
        label="Contraseña"
        help={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Usa una frase fácil de recordar para ti.`}
        error={errors.password}
      >
        {(aria) => (
          <PasswordInput
            {...aria}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => password && setError("password", validateNewPassword(password))}
          />
        )}
      </Field>
      <Field id={FIELD_IDS.confirm} label="Confirmar contraseña" error={errors.confirm}>
        {(aria) => (
          <PasswordInput
            {...aria}
            name="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => confirm && setError("confirm", validatePasswordConfirmation(password, confirm))}
          />
        )}
      </Field>
      <DataPolicyConsent
        id={FIELD_IDS.consent}
        checked={consent}
        error={errors.consent}
        onCheckedChange={(v) => {
          setConsent(v)
          if (v) setError("consent", null)
        }}
      />
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Activando…" : "Activar mi cuenta"}
      </Button>
    </form>
  )
}
