"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { type InvitationLink, InvitationLinkDialog } from "@/components/admin/invitation-link-dialog"
import { Button } from "@/components/ui/button"
import { resendAdminInvitation } from "@/lib/data/actions"

/** Superadmin: reenvía la invitación del administrador inicial mientras nadie la acepte. */
export function ResendAdminInvite({ invitationId, orgName }: { invitationId: string; orgName: string }) {
  const [shareLink, setShareLink] = useState<InvitationLink | null>(null)
  const [pending, startTransition] = useTransition()

  function resend() {
    startTransition(async () => {
      const res = await resendAdminInvitation(invitationId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (res.data.link) setShareLink({ email: `administrador de ${orgName}`, link: res.data.link })
      else toast.success(`Reenviamos la invitación al administrador de ${orgName}`)
    })
  }

  return (
    <>
      <Button variant="outline" loading={pending} onClick={resend}>
        Reenviar invitación al administrador
      </Button>
      <InvitationLinkDialog invite={shareLink} onClose={() => setShareLink(null)} />
    </>
  )
}
