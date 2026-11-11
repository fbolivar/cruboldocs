import type { Metadata } from "next"

import { SupplierSelfAssessmentForm } from "@/components/portal/supplier-self-assessment-form"
import { LogoHex } from "@/components/ui/logo-hex"
import { getPublicSupplierSelfAssessment } from "@/lib/data/queries"

export const metadata: Metadata = {
  title: "Autoevaluación de proveedor",
  robots: { index: false, follow: false },
}

export default async function SupplierSelfAssessmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const decoded = decodeURIComponent(token)
  const info = await getPublicSupplierSelfAssessment(decoded)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo px-4 py-10">
      <LogoHex />
      <div className="w-full max-w-md rounded-lg border border-borde bg-superficie p-6 shadow-sm">
        {!info ? (
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-h3 text-texto">Este formulario no está disponible</h1>
            <p className="text-small text-texto-sec">Puede que el enlace sea incorrecto o que ya no esté vigente.</p>
          </div>
        ) : (
          <SupplierSelfAssessmentForm token={decoded} supplier={info.supplier} organization={info.organization} />
        )}
      </div>
      <p className="text-caption text-texto-sec">CrubolDocs</p>
    </div>
  )
}
