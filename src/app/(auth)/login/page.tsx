import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import { param, safeNextPath } from "@/lib/url"

export const metadata: Metadata = { title: "Ingresar" }

export default async function LoginPage(props: PageProps<"/login">) {
  const next = safeNextPath(param(await props.searchParams, "siguiente"))
  return (
    <AuthCard aria-labelledby="login-title">
      <h1 id="login-title">Ingresa a CrubolDocs</h1>
      <LoginForm redirectTo={next} />
    </AuthCard>
  )
}
