import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { FormAlert } from "@/components/auth/form-alert"
import { LoginForm } from "@/components/auth/login-form"
import { SsoButtons } from "@/components/auth/sso-buttons"
import { param, safeNextPath } from "@/lib/url"

export const metadata: Metadata = { title: "Ingresar" }

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams
  const next = safeNextPath(param(sp, "siguiente"))
  const ssoError = param(sp, "sso") === "error"
  return (
    <AuthCard aria-labelledby="login-title">
      <h1 id="login-title">Ingresa a CrubolDocs</h1>
      {ssoError && (
        <FormAlert tone="error" className="mt-2">
          No pudimos completar el inicio con tu proveedor. Intenta de nuevo o usa tu correo.
        </FormAlert>
      )}
      <LoginForm redirectTo={next} />
      <SsoButtons next={next} />
    </AuthCard>
  )
}
