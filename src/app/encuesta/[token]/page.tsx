import type { Metadata } from "next"

import { SurveyForm } from "@/components/encuesta/survey-form"
import { LogoHex } from "@/components/ui/logo-hex"
import { getPublicSurvey } from "@/lib/data/queries"

export const metadata: Metadata = {
  title: "Encuesta de satisfacción",
  robots: { index: false, follow: false },
}

export default async function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const survey = await getPublicSurvey(decodeURIComponent(token))

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo px-4 py-10">
      <LogoHex />
      <div className="w-full max-w-md rounded-lg border border-borde bg-superficie p-6 shadow-sm">
        {!survey || !survey.isOpen ? (
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-h3 text-texto">Esta encuesta no está disponible</h1>
            <p className="text-small text-texto-sec">Puede que el enlace sea incorrecto o que la encuesta ya se haya cerrado.</p>
          </div>
        ) : (
          <SurveyForm token={decodeURIComponent(token)} title={survey.title} scale={survey.scale} />
        )}
      </div>
      <p className="text-caption text-texto-sec">CrubolDocs · Tus respuestas son anónimas</p>
    </div>
  )
}
