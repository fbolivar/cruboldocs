"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type * as React from "react"
import { toast } from "sonner"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { PASSWORD_MIN_LENGTH, validateNewPassword, validatePasswordConfirmation } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { updatePassword } from "@/lib/data/actions"

/** Nueva contraseña tras abrir el enlace de recuperación. */
export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next = { password: validateNewPassword(password), confirm: validatePasswordConfirmation(password, confirm) }
    setErrors(next)
    if (next.password || next.confirm) {
      document.getElementById(next.password ? "reset-password" : "reset-confirm")?.focus()
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await updatePassword(password)
      if (!res.ok) return setFormError(res.error)
      toast.success("Contraseña actualizada")
      router.push("/app")
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <Field
        id="reset-password"
        label="Nueva contraseña"
        help={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Usa una frase fácil de recordar para ti.`}
        error={errors.password}
      >
        {(aria) => (
          <PasswordInput {...aria} name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Field id="reset-confirm" label="Confirmar contraseña" error={errors.confirm}>
        {(aria) => (
          <PasswordInput {...aria} name="confirmPassword" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        )}
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  )
}
