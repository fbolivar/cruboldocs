import type * as React from "react"

import { cn } from "@/lib/utils"

/** Contenido del formulario de acceso dentro del marco unificado: solo ancho máximo y ritmo. */
export function AuthCard({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("flex w-full max-w-sm flex-col gap-5", className)} {...props} />
}

export const DATA_POLICY_HREF = "/tratamiento-de-datos"

/** Pie del acceso con enlace a la política de tratamiento de datos (Ley 1581). */
export function AuthFooter() {
  return (
    <p className="text-center text-small text-texto-sec">
      Crubol Technology S.A.S. ·{" "}
      <a href={DATA_POLICY_HREF} className="font-medium text-acento underline-offset-4 hover:underline">
        Tratamiento de datos (Ley 1581)
      </a>
    </p>
  )
}
