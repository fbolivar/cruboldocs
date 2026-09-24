"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ActionBar } from "@/components/ficha/action-bar"
import { ActionDialogs } from "@/components/ficha/action-dialogs"
import { DocumentHeader } from "@/components/ficha/document-header"
import * as up from "@/components/ficha/doc-updates"
import { FichaTabs } from "@/components/ficha/ficha-tabs"
import { MetaList } from "@/components/ficha/meta-list"
import { PdfViewer } from "@/components/ficha/pdf-viewer"
import { type DialogActionId, useFichaActions } from "@/components/ficha/use-ficha-actions"
import { SetBreadcrumb } from "@/components/shell/breadcrumb-context"
import { type DocumentActionId, getActionBar, isMetadataOnly } from "@/lib/domain/documents"
import type { CurrentUser, DocumentDetail } from "@/lib/types"

interface FichaViewProps {
  initialDoc: DocumentDetail
  user: CurrentUser
  /** Versión pedida por `?v=`; null = la más reciente. */
  versionNo: number | null
  /** Línea secundaria de la barra (vencimiento y contexto) para la tarea cuya primaria es `action`. */
  taskDetail: { action: DocumentActionId; text: string } | null
  /** Modal a abrir al llegar (`?accion=solicitar`, `?firmar=1`). */
  autoOpen: DialogActionId | null
}

/** Ficha del documento. El estado es local y optimista: el mock no persiste las acciones. */
export function FichaView({ initialDoc, user, versionNo, taskDetail, autoOpen }: FichaViewProps) {
  const router = useRouter()
  const [doc, setDoc] = useState(initialDoc)
  const [openedVersionId, setOpenedVersionId] = useState<string | null>(null)
  const version = doc.versions.find((v) => v.versionNo === versionNo) ?? doc.versions[0]
  const bar = getActionBar(doc, version, user)
  const base = `/app/documentos/${doc.id}`
  const hrefFor = (n: number) => (n === doc.versions[0].versionNo ? base : `${base}?v=${n}`)

  const allowedAutoOpen = autoOpen && bar && [bar.primary, ...bar.secondary].some((a) => a.id === autoOpen) ? autoOpen : null
  const actions = useFichaActions({
    doc,
    version,
    user,
    setDoc,
    initialOpen: allowedAutoOpen,
    onShowLatest: () => router.push(base, { scroll: false }),
  })

  // Quita `accion`/`firmar` de la URL para que recargar no vuelva a abrir el modal.
  useEffect(() => {
    if (!autoOpen) return
    const url = new URL(window.location.href)
    url.searchParams.delete("accion")
    url.searchParams.delete("firmar")
    window.history.replaceState(null, "", url.pathname + url.search)
  }, [autoOpen])

  const current = doc.versions.find((v) => v.status === "aprobada") ?? doc.versions[0]
  const pos = user.positionId
  const canComment =
    (version.status === "en_revision" && pos === doc.revisorPositionId) ||
    (pos === doc.elaboradorPositionId && (version.status === "en_revision" || version.status === "borrador"))
  const n = version.versionNo

  return (
    <>
      <SetBreadcrumb label={doc.code} />
      <DocumentHeader doc={doc} version={version} currentHref={current.id === version.id ? null : hrefFor(current.versionNo)} />
      {bar && (
        <ActionBar
          model={bar}
          detail={bar.taskMessage && taskDetail?.action === bar.primary.id ? taskDetail.text : null}
          pending={actions.pending}
          viewerOpened={openedVersionId === version.id}
          onAction={actions.run}
        />
      )}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          <PdfViewer key={version.id} code={doc.code} version={version} onOpened={() => setOpenedVersionId(version.id)} />
        </div>
        <MetaList doc={doc} version={version} />
      </div>
      <FichaTabs
        doc={doc}
        version={version}
        canComment={canComment}
        contentHidden={isMetadataOnly(user)}
        author={up.personOf(user)}
        hrefFor={hrefFor}
        onCommentAdded={(c) => setDoc((d) => up.addComment(d, n, c))}
        onCommentResolved={(id, at) => setDoc((d) => up.resolveComment(d, n, id, at))}
      />
      <ActionDialogs open={actions.open} setOpen={actions.setOpen} doc={doc} version={version} user={user} setDoc={setDoc} />
    </>
  )
}
