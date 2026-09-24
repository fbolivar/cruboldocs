import { LinkIcon } from "lucide-react"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { HexIcon } from "@/components/ui/hex-icon"

/** Estado de error de la invitación: vencida, usada o inexistente (mismo mensaje en todos los casos). */
export function InvitationInvalid() {
  return (
    <AuthCard role="alert" className="items-center text-center">
      <HexIcon icon={LinkIcon} tone="error" size="lg" />
      <h1>Esta invitación venció o ya fue usada.</h1>
      <p className="text-body-lg text-texto-sec">
        Pide al administrador de tu organización que te envíe una nueva.
      </p>
      <Link href="/login" className="text-small font-medium text-acento underline-offset-4 hover:underline">
        ¿Ya tienes cuenta? Ingresa
      </Link>
    </AuthCard>
  )
}
