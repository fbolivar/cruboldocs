// Actualizaciones locales (optimistas) de la ficha: reflejan el resultado de cada
// acción ya persistida sin recargar el documento completo.

import type {
  ChangeRequest,
  CurrentUser,
  DocumentDetail,
  DocumentStatus,
  DocumentVersion,
  PersonRef,
  ReviewComment,
  SignatureAction,
  VersionStatus,
} from "@/lib/types"

import { SIGNATURE_MEANING } from "@/lib/domain/documents"

export { SIGNATURE_MEANING }

export function personOf(user: CurrentUser): PersonRef {
  return { id: user.id, fullName: user.fullName, positionName: user.positionName ?? "Sin cargo" }
}

function mapVersion(doc: DocumentDetail, versionNo: number, fn: (v: DocumentVersion) => DocumentVersion): DocumentDetail {
  return { ...doc, versions: doc.versions.map((v) => (v.versionNo === versionNo ? fn(v) : v)) }
}

export function setVersionStatus(
  doc: DocumentDetail,
  versionNo: number,
  status: VersionStatus,
  docStatus: DocumentStatus
): DocumentDetail {
  return { ...mapVersion(doc, versionNo, (v) => ({ ...v, status })), status: docStatus }
}

export function applySignature(
  doc: DocumentDetail,
  versionNo: number,
  action: SignatureAction,
  signer: PersonRef,
  signedAt: string
): DocumentDetail {
  const signature = {
    id: `s-local-${signedAt}`,
    signer,
    action,
    meaning: SIGNATURE_MEANING[action],
    signedAt,
    ip: "Registrada por el servidor",
    signatureHash: signedAt.replace(/\D/g, "").padEnd(16, "0"),
  }
  if (action === "revision") {
    const next = mapVersion(doc, versionNo, (v) => ({
      ...v,
      status: "en_aprobacion",
      reviewedBy: signer,
      signatures: [...v.signatures, signature],
    }))
    return { ...next, status: "en_aprobacion" }
  }
  return {
    ...doc,
    status: "vigente",
    currentVersionNo: versionNo,
    versions: doc.versions.map((v) => {
      if (v.versionNo === versionNo) {
        return {
          ...v,
          status: "aprobada",
          approvedBy: signer,
          approvedAt: signedAt,
          effectiveDate: signedAt,
          signatures: [...v.signatures, signature],
        }
      }
      return v.status === "aprobada" ? { ...v, status: "reemplazada" } : v
    }),
  }
}

export function acknowledgeRead(doc: DocumentDetail, versionNo: number, userId: string, at: string): DocumentDetail {
  return mapVersion(doc, versionNo, (v) => ({
    ...v,
    reads: v.reads.map((r) => (r.userId === userId ? { ...r, acknowledgedAt: at } : r)),
  }))
}

export function addComment(doc: DocumentDetail, versionNo: number, comment: ReviewComment): DocumentDetail {
  return mapVersion(doc, versionNo, (v) => ({ ...v, comments: [...v.comments, comment] }))
}

export function resolveComment(doc: DocumentDetail, versionNo: number, commentId: string, at: string): DocumentDetail {
  return mapVersion(doc, versionNo, (v) => ({
    ...v,
    comments: v.comments.map((c) => (c.id === commentId ? { ...c, resolvedAt: at } : c)),
  }))
}

export function addChangeRequest(doc: DocumentDetail, requestedBy: PersonRef, reason: string): DocumentDetail {
  const request: ChangeRequest = {
    id: `cr-local-${Date.now()}`,
    requestedBy,
    reason,
    status: "abierta",
    createdAt: new Date().toISOString(),
    resolvedBy: null,
    resolution: null,
  }
  return { ...doc, changeRequests: [request, ...doc.changeRequests] }
}

export function resolveChangeRequest(
  doc: DocumentDetail,
  requestId: string,
  accept: boolean,
  resolvedBy: PersonRef,
  resolution: string
): DocumentDetail {
  return {
    ...doc,
    changeRequests: doc.changeRequests.map((r) =>
      r.id === requestId ? { ...r, status: accept ? "aceptada" : "rechazada", resolvedBy, resolution } : r
    ),
  }
}

/** Nueva versión en borrador a partir de la más reciente (el elaborador reemplaza luego los archivos). */
export function createDraftVersion(doc: DocumentDetail, elaboratedBy: PersonRef, changeSummary: string): DocumentDetail {
  const latest = doc.versions[0]
  const versionNo = latest.versionNo + 1
  const draft: DocumentVersion = {
    ...latest,
    id: `ver-local-${versionNo}`,
    versionNo,
    status: "borrador",
    changeSummary,
    sourceFileName: `v${versionNo}.docx`,
    elaboratedBy,
    reviewedBy: null,
    approvedBy: null,
    approvedAt: null,
    effectiveDate: null,
    comments: [],
    signatures: [],
    reads: [],
  }
  return { ...doc, versions: [draft, ...doc.versions] }
}

export function replaceFiles(doc: DocumentDetail, versionNo: number, sourceFileName: string): DocumentDetail {
  return mapVersion(doc, versionNo, (v) => ({ ...v, sourceFileName }))
}
