import type { Metadata } from "next"
import type * as React from "react"

import { AuthFooter } from "@/components/auth/auth-card"
import { BrandPanel } from "@/components/auth/brand-panel"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Acceso: panel de marca (40 %) + formulario. En móvil, franja de marca arriba y formulario debajo. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-5">
      <BrandPanel className="md:col-span-2" />
      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-6 md:col-span-3 md:justify-center md:gap-8 md:p-8">
        {children}
        <AuthFooter />
      </main>
    </div>
  )
}
