import type { Metadata } from "next"
import type * as React from "react"

import { AuthFooter } from "@/components/auth/auth-card"
import { BrandPanel } from "@/components/auth/brand-panel"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Acceso: marco unificado y centrado (dos paneles dentro de un contenedor redondeado).
 * Escritorio: panel de marca (izq.) + formulario (der.), ambos en el mismo marco.
 * Móvil: a pantalla completa, franja de marca arriba y formulario debajo.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fondo md:items-center md:justify-center md:p-8">
      <div className="flex min-h-dvh flex-col overflow-hidden md:grid md:min-h-[34rem] md:w-full md:max-w-5xl md:grid-cols-2 md:rounded-lg md:border md:border-borde md:bg-superficie md:shadow-lg">
        <BrandPanel />
        <main className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-8 md:p-12">
          {children}
          <AuthFooter />
        </main>
      </div>
    </div>
  )
}
