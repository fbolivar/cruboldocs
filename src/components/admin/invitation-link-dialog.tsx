"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export interface InvitationLink {
  email: string
  link: string
}

/**
 * Enlace de invitación para compartir a mano. Solo aparece mientras el correo (SMTP) no está
 * configurado; el enlace es personal y vence en 7 días.
 */
export function InvitationLinkDialog({ invite, onClose }: { invite: InvitationLink | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!invite) return
    await navigator.clipboard.writeText(invite.link).catch(() => {})
    setCopied(true)
  }

  return (
    <Dialog
      open={!!invite}
      onOpenChange={(v) => {
        if (!v) {
          setCopied(false)
          onClose()
        }
      }}
    >
      <DialogContent className="p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-h3">Comparte el enlace de invitación</DialogTitle>
          <DialogDescription className="text-body text-texto-sec">
            El envío de correos aún no está activo. Copia este enlace y envíalo a <strong>{invite?.email}</strong> por un
            medio de confianza. Es personal y vence en 7 días.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={invite?.link ?? ""} aria-label="Enlace de invitación" onFocus={(e) => e.currentTarget.select()} className="font-mono text-small" />
        <DialogFooter>
          <Button onClick={copy}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
