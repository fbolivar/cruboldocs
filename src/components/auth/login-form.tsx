"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type * as React from "react"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { validateEmail, validateRequired } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/data/actions"

type Errors = { email?: string | null; password?: string | null }

const passwordError = (v: string) => validateRequired(v, "Escribe tu contraseña.")

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: Errors = { email: validateEmail(email), password: passwordError(password) }
    setErrors(next)
    if (next.email || next.password) {
      document.getElementById(next.email ? "login-email" : "login-password")?.focus()
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await login(email.trim(), password)
      if (res.ok) {
        router.push("/app")
        return
      }
      // Mensaje genérico: nunca indica si falló el correo o la contraseña.
      setFormError("Correo o contraseña incorrectos.")
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <Field id="login-email" label="Correo" error={errors.email}>
        {(aria) => (
          <Input
            {...aria}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setErrors((p) => ({ ...p, email: validateEmail(email) }))}
          />
        )}
      </Field>
      <Field id="login-password" label="Contraseña" error={errors.password}>
        {(aria) => (
          <PasswordInput
            {...aria}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => errors.password && setErrors((p) => ({ ...p, password: passwordError(password) }))}
          />
        )}
      </Field>
      <Link
        href="/recuperar"
        className="self-start text-small font-medium text-acento underline-offset-4 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  )
}
