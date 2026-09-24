import type * as React from "react"

import { cn } from "@/lib/utils"

/** Card del formulario de acceso: máx. 400px; en móvil ocupa el ancho sin borde ni sombra. */
export function AuthCard({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex w-full max-w-100 flex-col gap-4 md:rounded-md md:border md:border-borde md:bg-superficie md:p-8 md:shadow-sm",
        className
      )}
      {...props}
    />
  )
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
