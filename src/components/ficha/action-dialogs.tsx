"use client"

import { toast } from "sonner"

import * as up from "@/components/ficha/doc-updates"
import { type ReasonDialogConfig, ReasonDialog } from "@/components/ficha/reason-dialog"
import { ReplaceFilesDialog } from "@/components/ficha/replace-files-dialog"
import { SignatureDialog } from "@/components/ficha/signature-dialog"
import type { DialogActionId } from "@/components/ficha/use-ficha-actions"
import { requestUpdate, resolveChangeRequest, returnVersion } from "@/lib/data/actions"
import type { CurrentUser, DocumentDetail, DocumentVersion, Result } from "@/lib/types"

type ReasonAction = "devolver" | "rechazar" | "solicitar_actualizacion" | "rechazar_solicitud"

interface ActionDialogsProps {
  open: DialogActionId | null
  setOpen: (id: DialogActionId | null) => void
  doc: DocumentDetail
  version: DocumentVersion
  user: CurrentUser
  setDoc: (fn: (d: DocumentDetail) => DocumentDetail) => void
}

/** Modales de la barra de acción: firma, motivo obligatorio y reemplazo de archivos. */
export function ActionDialogs({ open, setOpen, doc, version, user, setDoc }: ActionDialogsProps) {
  const n = version.versionNo
  const me = up.personOf(user)
  const request = doc.changeRequests.find((r) => r.status === "abierta")
  const onOpenChange = (next: boolean) => !next && setOpen(null)

  const returnToDraft = (reason: string) =>
    setDoc((d) =>
      up.addComment(up.setVersionStatus(d, n, "borrador", "borrador"), n, {
        id: `c-local-${Date.now()}`,
        author: me,
        body: reason,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      })
    )

  const reasons: Record<ReasonAction, ReasonDialogConfig & { submit: (r: string) => Promise<Result<unknown>>; done: (r: string) => void }> = {
    devolver: {
      title: `Devolver la versión ${n} con comentarios`,
      description: "La versión vuelve a borrador y el elaborador recibe tus comentarios.",
      label: "Comentarios para el elaborador",
      confirmLabel: "Devolver",
      submit: (r) => returnVersion(doc.id, n, r),
      done: (r) => {
        returnToDraft(r)
        toast.success(`Versión ${n} devuelta al elaborador.`)
      },
    },
    rechazar: {
      title: `Rechazar la versión ${n}`,
      description: "La versión vuelve a borrador para que el elaborador la corrija.",
      label: "Motivo del rechazo",
      confirmLabel: "Rechazar",
      destructive: true,
      submit: (r) => returnVersion(doc.id, n, r),
      done: (r) => {
        returnToDraft(r)
        toast.success(`Versión ${n} rechazada. Vuelve a borrador.`)
      },
    },
    solicitar_actualizacion: {
      title: `Solicitar actualización de ${doc.code}`,
      description: "El elaborador y el líder del proceso recibirán tu solicitud.",
      label: "¿Qué debe cambiar y por qué?",
      confirmLabel: "Enviar solicitud",
      submit: (r) => requestUpdate(doc.id, r),
      done: (r) => {
        setDoc((d) => up.addChangeRequest(d, me, r))
        toast.success("Solicitud enviada. Te avisaremos cuando la atiendan.")
      },
    },
    rechazar_solicitud: {
      title: "Rechazar la solicitud de actualización",
      description: request ? `«${request.reason}» — ${request.requestedBy.fullName}` : "",
      label: "Motivo del rechazo",
      confirmLabel: "Rechazar solicitud",
      destructive: true,
      submit: (r) => (request ? resolveChangeRequest(request.id, false, r) : Promise.resolve({ ok: true, data: undefined })),
      done: (r) => {
        if (request) setDoc((d) => up.resolveChangeRequest(d, request.id, false, me, r))
        toast.success("Solicitud rechazada. Le avisaremos al solicitante.")
      },
    },
  }

  if (open === "firmar_revision" || open === "firmar_aprobacion") {
    const action = open === "firmar_revision" ? "revision" : "aprobacion"
    return (
      <SignatureDialog
        open
        onOpenChange={onOpenChange}
        documentId={doc.id}
        code={doc.code}
        title={doc.title}
        versionNo={n}
        pdfSha256={version.pdfSha256}
        action={action}
        onSigned={(at) => {
          setDoc((d) => up.applySignature(d, n, action, me, at))
          toast.success(
            action === "aprobacion"
              ? `Aprobación firmada. ${doc.code} v${n} está vigente.`
              : `Revisión firmada. ${doc.code} v${n} pasa a aprobación.`
          )
        }}
      />
    )
  }

  if (open === "reemplazar_archivos") {
    return (
      <ReplaceFilesDialog
        open
        onOpenChange={onOpenChange}
        versionNo={n}
        onDone={(name) => {
          setDoc((d) => up.replaceFiles(d, n, name))
          toast.success("Archivos reemplazados. Revisa el PDF antes de enviarlo a revisión.")
        }}
      />
    )
  }

  if (open && open in reasons) {
    const { submit, done, ...config } = reasons[open as ReasonAction]
    return <ReasonDialog key={open} open onOpenChange={onOpenChange} onSubmit={submit} onDone={done} {...config} />
  }
  return null
}
