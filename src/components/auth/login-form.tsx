"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import type * as React from "react"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { validateEmail, validateRequired } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/data/actions"

type Errors = { email?: string | null; password?: string | null }

const passwordError = (v: string) => validateRequired(v, "Escribe tu contraseña.")

export function LoginForm({ redirectTo = "/app" }: { redirectTo?: string }) {
  const router = useRouter()
  const captcha = useRef<TurnstileHandle>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
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
    if (CAPTCHA_ENABLED && !captchaToken) {
      setFormError(CAPTCHA_PENDING)
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await login(email.trim(), password, captchaToken ?? "")
      if (res.ok) {
        router.push(redirectTo)
        return
      }
      // El servidor responde genérico: nunca indica si falló el correo o la contraseña.
      setFormError(res.error)
      captcha.current?.reset()
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
      <Turnstile ref={captcha} action="login" onToken={setCaptchaToken} />
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  )
}
