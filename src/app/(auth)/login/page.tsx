import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Ingresar" }

export default function LoginPage() {
  return (
    <AuthCard aria-labelledby="login-title">
      <h1 id="login-title">Ingresa a CrubolDocs</h1>
      <LoginForm />
    </AuthCard>
  )
}
