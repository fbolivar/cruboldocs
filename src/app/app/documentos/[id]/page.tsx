import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FichaView } from "@/components/ficha/ficha-view"
import type { DialogActionId } from "@/components/ficha/use-ficha-actions"
import { Page } from "@/components/shell/page"
import { NormCell } from "@/components/multinorma/norm-cell"
import { getCurrentUser, getDocument, getEntityNorms, getMyTasks, listActiveNorms } from "@/lib/data/queries"
import { canTagNorms } from "@/lib/domain/access"
import type { DocumentActionId } from "@/lib/domain/documents"
import { dueLabel, formatDate } from "@/lib/format"
import type { DocumentDetail, TaskType } from "@/lib/types"

export async function generateMetadata({ params }: PageProps<"/app/documentos/[id]">): Promise<Metadata> {
  const { id } = await params
  const doc = await getDocument(id, await getCurrentUser()).catch(() => null)
  return { title: doc ? `${doc.code} · ${doc.title}` : "Documento" }
}

/** Tarea de la bandeja que corresponde a la acción primaria de la barra. */
const TASK_FOR: Partial<Record<DocumentActionId, TaskType>> = {
  enviar_revision: "corregir",
  firmar_revision: "revisar",
  firmar_aprobacion: "aprobar",
  confirmar_lectura: "confirmar_lectura",
  crear_version: "atender_solicitud",
}

function reviewContext(doc: DocumentDetail): string | null {
  const sig = doc.versions[0].signatures.find((s) => s.action === "revision")
  if (doc.status !== "en_aprobacion" || !sig) return null
  return `Revisada y firmada por ${sig.signer.fullName} (${sig.signer.positionName}) el ${formatDate(sig.signedAt)}`
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function DocumentoPage({ params, searchParams }: PageProps<"/app/documentos/[id]">) {
  const { id } = await params
  const sp = await searchParams
  const user = await getCurrentUser()
  const doc = await getDocument(id, user)
  if (!doc) notFound()

  const [norms, taggedNorms] = await Promise.all([listActiveNorms(), getEntityNorms("documento", doc.id)])

  const vParam = Number.parseInt(first(sp.v) ?? "", 10)
  const versionNo = doc.versions.some((v) => v.versionNo === vParam) ? vParam : null

  // Vencimiento de la tarea: dato vivo de la bandeja; si falla, la barra se muestra sin él.
  const tasks = await getMyTasks(user).catch(() => [])
  const href = `/app/documentos/${doc.id}`
  const entries = Object.entries(TASK_FOR) as [DocumentActionId, TaskType][]
  const match = entries
    .map(([action, type]) => ({ action, task: tasks.find((t) => t.href === href && t.type === type) }))
    .find((m) => m.task)
  const taskDetail = match?.task
    ? {
        action: match.action,
        text: [`${dueLabel(match.task.dueDate)} (${formatDate(match.task.dueDate)})`, reviewContext(doc)]
          .filter(Boolean)
          .join(" · "),
      }
    : null

  const accion = first(sp.accion)
  const autoOpen: DialogActionId | null =
    accion === "solicitar"
      ? "solicitar_actualizacion"
      : first(sp.firmar) === "1"
        ? doc.status === "en_revision"
          ? "firmar_revision"
          : "firmar_aprobacion"
        : null

  return (
    <Page>
      <FichaView key={doc.id} initialDoc={doc} user={user} versionNo={versionNo} taskDetail={taskDetail} autoOpen={autoOpen} />
      {norms.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-small text-texto-sec">
          <span>Normas:</span>
          <NormCell entityType="documento" entityId={doc.id} allNorms={norms} tagged={taggedNorms} canManage={canTagNorms(user)} />
        </div>
      )}
    </Page>
  )
}
