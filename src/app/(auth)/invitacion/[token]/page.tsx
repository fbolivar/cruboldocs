import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { FormAlert } from "@/components/auth/form-alert"
import { InvitationForm } from "@/components/auth/invitation-form"
import { InvitationInvalid } from "@/components/auth/invitation-invalid"
import { InvitationJoin } from "@/components/auth/invitation-join"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/data/actions"
import { getInvitation } from "@/lib/data/queries"
import { formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Activa tu cuenta" }

// Si el correo ya tiene cuenta, la invitación se acepta con la sesión iniciada de esa cuenta:
// nunca se pide su contraseña aquí (evita adivinarla y revelar qué correos tienen cuenta).
export default async function InvitationPage(props: PageProps<"/invitacion/[token]">) {
  const { token } = await props.params
  const invitation = await getInvitation(token)

  if (!invitation || invitation.status !== "valida") return <InvitationInvalid />

  const { data: auth } = await (await createClient()).auth.getUser()
  const sessionEmail = auth.user?.email?.toLowerCase() ?? null
  const isInvitedAccount = sessionEmail === invitation.email

  return (
    <AuthCard aria-labelledby="inv-title">
      <div className="flex flex-col gap-2">
        <h1 id="inv-title">{invitation.accountExists ? "Únete a tu organización" : "Activa tu cuenta"}</h1>
        <p className="text-body-lg text-texto-sec">
          Te invitaron a <strong className="font-semibold text-texto">{invitation.organizationName}</strong> como{" "}
          <strong className="font-semibold text-texto">{invitation.positionName}</strong>.
        </p>
        <p className="text-small text-texto-sec">
          {invitation.accountExists ? "Tu cuenta" : "Ingresarás con"}{" "}
          <span className="font-medium text-texto">{invitation.email}</span>
        </p>
      </div>
      {invitation.isExternal && invitation.validUntil && (
        <FormAlert tone="info">Tu acceso es temporal hasta el {formatDate(invitation.validUntil)}.</FormAlert>
      )}

      {sessionEmail && !isInvitedAccount ? (
        <>
          <FormAlert tone="info">
            Tienes la sesión iniciada con otro correo. Cierra sesión y vuelve a abrir el enlace de la invitación.
          </FormAlert>
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </>
      ) : isInvitedAccount ? (
        <InvitationJoin token={token} organizationName={invitation.organizationName} />
      ) : invitation.accountExists ? (
        <>
          <p className="text-texto-sec">Ya tienes una cuenta en CrubolDocs. Ingresa con ella para aceptar la invitación.</p>
          <Button asChild className="w-full">
            <Link href={`/login?siguiente=/invitacion/${token}`}>Ingresar para unirme</Link>
          </Button>
        </>
      ) : (
        <InvitationForm token={token} email={invitation.email} />
      )}
    </AuthCard>
  )
}
