import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = { title: "Nueva contraseña" }

export default function ResetPasswordPage() {
  return (
    <AuthCard aria-labelledby="reset-title">
      <h1 id="reset-title">Crea una nueva contraseña</h1>
      <ResetPasswordForm />
    </AuthCard>
  )
}
