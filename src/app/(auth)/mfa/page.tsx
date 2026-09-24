import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthCard } from "@/components/auth/auth-card"
import { MfaForm } from "@/components/auth/mfa-form"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/data/actions"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Verificación en dos pasos" }

/** Segundo factor obligatorio de la cuenta Superadmin: registrar la app (primera vez) o escribir el código. */
export default async function MfaPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims?.sub) redirect("/login")
  const { data: isAccount } = await supabase.rpc("is_platform_admin_account")
  if (!isAccount || auth.claims.aal === "aal2") redirect("/app")
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const factorId = factors?.totp[0]?.id ?? null

  return (
    <AuthCard aria-labelledby="mfa-title">
      <h1 id="mfa-title">Verificación en dos pasos</h1>
      <p className="text-body-lg text-texto-sec">
        {factorId
          ? "Escribe el código de 6 dígitos que muestra tu app de autenticación."
          : "La cuenta de Superadministrador exige un segundo factor. Registra una app de autenticación (Google Authenticator, Microsoft Authenticator u otra) para continuar."}
      </p>
      <MfaForm factorId={factorId} />
      <form action={logout}>
        <Button type="submit" variant="outline" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </AuthCard>
  )
}
