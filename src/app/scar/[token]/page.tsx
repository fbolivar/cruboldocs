import type { Metadata } from "next"

import { ScarPublicForm } from "@/components/portal/scar-public-form"
import { LogoHex } from "@/components/ui/logo-hex"
import { getPublicScar } from "@/lib/data/queries"

export const metadata: Metadata = {
  title: "Acción correctiva",
  robots: { index: false, follow: false },
}

export default async function ScarPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const decoded = decodeURIComponent(token)
  const scar = await getPublicScar(decoded)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo px-4 py-10">
      <LogoHex />
      <div className="w-full max-w-md rounded-lg border border-borde bg-superficie p-6 shadow-sm">
        {!scar ? (
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-h3 text-texto">Este formulario no está disponible</h1>
            <p className="text-small text-texto-sec">Puede que el enlace sea incorrecto, ya se respondió o se cerró.</p>
          </div>
        ) : (
          <ScarPublicForm token={decoded} organization={scar.organization} supplier={scar.supplier} title={scar.title} description={scar.description} dueDate={scar.dueDate} />
        )}
      </div>
      <p className="text-caption text-texto-sec">CrubolDocs</p>
    </div>
  )
}
