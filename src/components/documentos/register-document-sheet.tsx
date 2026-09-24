"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { ErrorSummary } from "@/components/documentos/error-summary"
import { RegisterFiles } from "@/components/documentos/register-files"
import { RegisterIdentification } from "@/components/documentos/register-identification"
import { RegisterResponsables } from "@/components/documentos/register-responsables"
import { FIELD_ORDER, useRegisterForm, type RegisterCatalogs } from "@/components/documentos/use-register-form"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { registerDocument } from "@/lib/data/actions"

export type { RegisterCatalogs }

type Mode = "borrador" | "revision"

interface RegisterDocumentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogs: RegisterCatalogs
}

/** Drawer derecho (480 px; pantalla completa en móvil) para registrar un documento en 3 secciones. */
export function RegisterDocumentSheet({ open, onOpenChange, catalogs }: RegisterDocumentSheetProps) {
  const router = useRouter()
  const form = useRegisterForm(catalogs)
  const [sending, setSending] = useState<Mode | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const invalid = FIELD_ORDER.filter((k) => form.errors[k])
  const showSummary = form.submitted && (invalid.length > 0 || !!serverError)

  const submit = async (mode: Mode) => {
    form.setSubmitted(true)
    setServerError(null)
    if (invalid.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    const v = form.values
    setSending(mode)
    const res = await registerDocument({
      processId: v.processId,
      typeId: v.typeId,
      title: v.title.trim(),
      code: v.code.trim().toUpperCase(),
      elaboradorPositionId: v.elaborador,
      revisorPositionId: v.revisor,
      aprobadorPositionId: v.aprobador,
      distributionPositionIds: v.distribution,
      readRequired: v.readRequired,
      reviewEveryMonths: Number(v.reviewMonths),
      changeSummary: v.changeSummary.trim(),
      pdfFileName: v.pdf?.name ?? "",
      sourceFileName: v.source?.name ?? "",
      submitForReview: mode === "revision",
    }).catch(() => ({ ok: false as const, error: "No pudimos registrar el documento. Revisa tu conexión e inténtalo de nuevo." }))
    setSending(null)

    if (!res.ok) {
      setServerError(res.error)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    toast.success(
      mode === "revision" ? `Documento ${res.data.code} enviado a revisión` : `Documento ${res.data.code} guardado como borrador`
    )
    onOpenChange(false)
    form.reset()
    router.push(`/app/documentos/${res.data.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <SheetContent
        side="right"
        className="gap-0 bg-superficie p-0 text-body text-texto"
      >
        <SheetHeader className="gap-1 border-b border-borde px-4 py-4 pr-14 md:px-6">
          <SheetTitle className="font-display text-h2 text-texto">Registrar documento</SheetTitle>
          <SheetDescription className="text-small text-texto-sec">
            Se guardará como borrador hasta que lo envíes a revisión.
          </SheetDescription>
        </SheetHeader>

        <form
          id="form-registrar"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit("revision")
          }}
          className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 md:px-6"
        >
          {showSummary && <ErrorSummary ref={summaryRef} fields={invalid} errors={form.errors} serverError={serverError} />}
          <RegisterIdentification form={form} />
          <RegisterResponsables form={form} />
          <RegisterFiles form={form} />
        </form>

        <div className="flex flex-col-reverse gap-3 border-t border-borde px-4 py-4 sm:flex-row sm:justify-end md:px-6">
          <Button variant="outline" onClick={() => void submit("borrador")} loading={sending === "borrador"} disabled={!!sending}>
            Guardar borrador
          </Button>
          <Button type="submit" form="form-registrar" loading={sending === "revision"} disabled={!!sending}>
            Enviar a revisión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
