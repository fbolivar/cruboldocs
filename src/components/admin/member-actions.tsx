"use client"

import { BriefcaseIcon, CalendarClockIcon, MailIcon, UserXIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { type InvitationLink, InvitationLinkDialog } from "@/components/admin/invitation-link-dialog"
import { MemberEditDialog } from "@/components/admin/member-edit-dialog"
import type { Option } from "@/components/admin/option-select"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { MENU_ITEM_CLASS, RowMenuTrigger } from "@/components/admin/row-menu-trigger"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { resendInvitation, revokeAccess } from "@/lib/data/actions"
import type { Member } from "@/lib/types"

type DialogKind = "cargo" | "vigencia" | "revocar" | null

/** Menú "⋯" de una membresía: cambiar cargo, editar vigencia, reenviar invitación y revocar acceso. */
export function MemberActions({ member, positions }: { member: Member; positions: Option[] }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [pending, startTransition] = useTransition()
  const [shareLink, setShareLink] = useState<InvitationLink | null>(null)
  const name = member.fullName ?? member.email
  const active = member.status === "activo" || member.status === "invitado"

  function resend() {
    startTransition(async () => {
      const res = await resendInvitation(member.membershipId)
      if (!res.ok) return void toast.error(res.error)
      if (res.data.link) setShareLink({ email: member.email, link: res.data.link })
      else toast.success(`Invitación reenviada a ${member.email}`)
    })
  }

  function revoke() {
    startTransition(async () => {
      const res = await revokeAccess(member.membershipId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Acceso revocado")
      setDialog(null)
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <RowMenuTrigger label={`Acciones para ${name}`} disabled={pending && dialog === null} />
        <DropdownMenuContent align="end" className="w-56">
          {member.status !== "revocado" && (
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => setDialog("cargo")}>
              <BriefcaseIcon aria-hidden="true" />
              Cambiar cargo
            </DropdownMenuItem>
          )}
          {member.isExternal && member.status !== "revocado" && (
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => setDialog("vigencia")}>
              <CalendarClockIcon aria-hidden="true" />
              Editar vigencia
            </DropdownMenuItem>
          )}
          {member.status === "invitado" && (
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={resend}>
              <MailIcon aria-hidden="true" />
              Reenviar invitación
            </DropdownMenuItem>
          )}
          {active && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className={MENU_ITEM_CLASS} onSelect={() => setDialog("revocar")}>
                <UserXIcon aria-hidden="true" />
                Revocar acceso
              </DropdownMenuItem>
            </>
          )}
          {member.status === "revocado" && (
            <DropdownMenuItem disabled className={MENU_ITEM_CLASS}>
              Sin acciones disponibles
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(dialog === "cargo" || dialog === "vigencia") && (
        <MemberEditDialog member={member} mode={dialog} positions={positions} onClose={() => setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog === "revocar"}
        onOpenChange={(v) => !v && setDialog(null)}
        title={`¿Revocar el acceso de ${name}?`}
        description="Dejará de ver documentos, riesgos y tareas de la organización de inmediato. La acción queda registrada en la auditoría."
        confirmLabel="Revocar acceso"
        pending={pending}
        onConfirm={revoke}
      />
      <InvitationLinkDialog invite={shareLink} onClose={() => setShareLink(null)} />
    </>
  )
}
