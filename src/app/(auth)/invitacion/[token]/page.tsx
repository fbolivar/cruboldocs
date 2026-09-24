import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { FormAlert } from "@/components/auth/form-alert"
import { InvitationForm } from "@/components/auth/invitation-form"
import { InvitationInvalid } from "@/components/auth/invitation-invalid"
import { getInvitation } from "@/lib/data/queries"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Activa tu cuenta" }

export default async function InvitationPage(props: PageProps<"/invitacion/[token]">) {
  const { token } = await props.params
  const invitation = await getInvitation(token)

  if (!invitation || invitation.status !== "valida") return <InvitationInvalid />

  return (
    <AuthCard aria-labelledby="inv-title">
      <div className="flex flex-col gap-2">
        <h1 id="inv-title">Activa tu cuenta</h1>
        <p className="text-body-lg text-texto-sec">
          Te invitaron a <strong className="font-semibold text-texto">{invitation.organizationName}</strong> como{" "}
          <strong className="font-semibold text-texto">{invitation.positionName}</strong>.
        </p>
        <p className="text-small text-texto-sec">
          Ingresarás con <span className="font-medium text-texto">{invitation.email}</span>
        </p>
      </div>
      {invitation.isExternal && invitation.validUntil && (
        <FormAlert tone="info">Tu acceso es temporal hasta el {formatDate(invitation.validUntil)}.</FormAlert>
      )}
      <InvitationForm token={token} email={invitation.email} />
    </AuthCard>
  )
}
