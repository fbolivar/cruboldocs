import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { RecoverForm } from "@/components/auth/recover-form"

export const metadata: Metadata = { title: "Recuperar contraseña" }

export default function RecoverPage() {
  return (
    <AuthCard>
      <RecoverForm />
    </AuthCard>
  )
}
