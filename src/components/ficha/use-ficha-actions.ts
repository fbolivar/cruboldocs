"use client"

import { useState } from "react"
import { toast } from "sonner"

import * as up from "@/components/ficha/doc-updates"
import { confirmRead, resolveChangeRequest, submitForReview } from "@/lib/data/actions"
import type { DocumentActionId } from "@/lib/domain/documents"
import type { CurrentUser, DocumentDetail, DocumentVersion } from "@/lib/types"

/** Acciones que abren un modal; el resto se ejecutan directo desde la barra. */
export type DialogActionId = Exclude<DocumentActionId, "enviar_revision" | "confirmar_lectura" | "crear_version">

const DIRECT: DocumentActionId[] = ["enviar_revision", "confirmar_lectura", "crear_version"]

interface Options {
  doc: DocumentDetail
  version: DocumentVersion
  user: CurrentUser
  setDoc: (fn: (d: DocumentDetail) => DocumentDetail) => void
  initialOpen: DialogActionId | null
  /** Tras crear una versión, la ficha vuelve a mostrar la más reciente. */
  onShowLatest: () => void
}

export function useFichaActions({ doc, version, user, setDoc, initialOpen, onShowLatest }: Options) {
  const [open, setOpen] = useState<DialogActionId | null>(initialOpen)
  const [pending, setPending] = useState<DocumentActionId | null>(null)
  const n = version.versionNo

  async function runDirect(id: DocumentActionId) {
    setPending(id)
    try {
      if (id === "enviar_revision") {
        const res = await submitForReview(doc.id, n)
        if (!res.ok) return void toast.error(res.error)
        setDoc((d) => up.setVersionStatus(d, n, "en_revision", "en_revision"))
        toast.success(`${doc.code} v${n} enviada a revisión.`)
      } else if (id === "confirmar_lectura") {
        const res = await confirmRead(doc.id, n)
        if (!res.ok) return void toast.error(res.error)
        setDoc((d) => up.acknowledgeRead(d, n, user.id, res.data.at))
        toast.success("Lectura confirmada")
      } else if (id === "crear_version") {
        const request = doc.changeRequests.find((r) => r.status === "abierta")
        if (!request) return
        const next = doc.versions[0].versionNo + 1
        const resolution = `Se crea la versión ${next}.`
        const res = await resolveChangeRequest(request.id, true, resolution)
        if (!res.ok) return void toast.error(res.error)
        const me = up.personOf(user)
        setDoc((d) => up.createDraftVersion(up.resolveChangeRequest(d, request.id, true, me, resolution), me, request.reason))
        onShowLatest()
        toast.success(`Solicitud aceptada. Se creó la versión ${next} en borrador.`)
      }
    } catch {
      toast.error("No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.")
    } finally {
      setPending(null)
    }
  }

  function run(id: DocumentActionId) {
    if (DIRECT.includes(id)) void runDirect(id)
    else setOpen(id as DialogActionId)
  }

  return { open, setOpen, pending, run }
}
