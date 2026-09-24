import { CircleAlertIcon, InfoIcon } from "lucide-react"
import type * as React from "react"

import { cn } from "@/lib/utils"

const TONES = {
  error: { box: "bg-error-suave text-error-texto", icon: CircleAlertIcon },
  info: { box: "bg-acento-suave text-acento", icon: InfoIcon },
} as const

interface FormAlertProps {
  tone: keyof typeof TONES
  children: React.ReactNode
  className?: string
}

/** Aviso dentro de la card de acceso. El error se anuncia (role="alert"); el info es estático. */
export function FormAlert({ tone, children, className }: FormAlertProps) {
  const t = TONES[tone]
  const Icon = t.icon
  return (
    <div
      role={tone === "error" ? "alert" : "note"}
      className={cn("flex items-start gap-2 rounded-sm px-3 py-2 text-small", t.box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
