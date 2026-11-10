"use client"

import { LockIcon, MailIcon } from "lucide-react"
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

// Estilo de campo del login (línea inferior, sin caja): override local, no toca el Input compartido.
const lineInput =
  "auth-field-line h-11 rounded-none border-0 border-b-2 bg-transparent px-0 ps-8 focus:border-acento md:h-11"
const leadIcon = "pointer-events-none absolute start-0 top-1/2 size-[18px] -translate-y-1/2 text-texto-sec"

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
          <div className="relative">
            <MailIcon aria-hidden="true" className={leadIcon} />
            <Input
              {...aria}
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              className={lineInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && setErrors((p) => ({ ...p, email: validateEmail(email) }))}
            />
          </div>
        )}
      </Field>
      <Field id="login-password" label="Contraseña" error={errors.password}>
        {(aria) => (
          <div className="relative">
            <LockIcon aria-hidden="true" className={leadIcon} />
            <PasswordInput
              {...aria}
              name="password"
              autoComplete="current-password"
              className={lineInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => errors.password && setErrors((p) => ({ ...p, password: passwordError(password) }))}
            />
          </div>
        )}
      </Field>
      <Link
        href="/recuperar"
        className="self-end text-small font-medium text-acento underline-offset-4 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>
      <Turnstile ref={captcha} action="login" onToken={setCaptchaToken} />
      <Button type="submit" loading={pending} className="w-full rounded-full">
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  )
}
