// Datos de prueba tipados para la lógica de dominio.
import type { CurrentUser, DocumentDetail, DocumentVersion, PositionRole, Task } from "@/lib/types"

export const POS = { elaborador: "pos-elab", revisor: "pos-rev", aprobador: "pos-apr", lector: "pos-lector", otro: "pos-otro" }
export const PROC = { sig: "proc-sig", ti: "proc-ti" }

export function user(over: Partial<CurrentUser> = {}, roles: PositionRole[] = []): CurrentUser {
  return {
    id: "user-1",
    fullName: "Laura Pérez",
    email: "laura@acme.co",
    positionId: POS.otro,
    positionName: "Cargo",
    organization: { id: "org-a", name: "Acme" },
    organizations: [{ id: "org-a", name: "Acme" }],
    isOrgAdmin: false,
    isPlatformAdmin: false,
    isExternal: false,
    validUntil: null,
    roles,
    locale: "es",
    ...over,
  }
}

const person = { id: "p", fullName: "Persona", positionName: "Cargo" }

export function version(over: Partial<DocumentVersion> = {}): DocumentVersion {
  return {
    id: "v1",
    versionNo: 1,
    status: "borrador",
    changeSummary: "Creación",
    pdfUrl: null,
    sourceUrl: null,
    sourceFileName: "fuente.docx",
    pdfSha256: "a".repeat(64),
    pageCount: 1,
    elaboratedBy: person,
    reviewedBy: null,
    approvedBy: null,
    approvedAt: null,
    effectiveDate: null,
    comments: [],
    signatures: [],
    reads: [],
    ...over,
  }
}

export function doc(versions: DocumentVersion[], over: Partial<DocumentDetail> = {}): DocumentDetail {
  return {
    id: "doc-1",
    code: "PR-GC-001",
    title: "Control de documentos",
    status: "borrador",
    processId: PROC.sig,
    processName: "Gestión SIG",
    typeId: "tipo-pr",
    typeCode: "PR",
    typeName: "Procedimiento",
    currentVersionNo: 1,
    nextReviewDate: null,
    reviewOverdue: false,
    elaboradorPositionId: POS.elaborador,
    elaboradorPositionName: "Elaborador",
    revisorPositionId: POS.revisor,
    revisorPositionName: "Revisor",
    aprobadorPositionId: POS.aprobador,
    aprobadorPositionName: "Aprobador",
    reviewEveryMonths: 12,
    readRequired: true,
    distributionPositionIds: [POS.lector],
    distributionCount: 1,
    versions,
    changeRequests: [],
    localizedTitle: "Control de documentos",
    titleFallback: false,
    titleEn: "",
    canTranslate: false,
    ...over,
  }
}

export function task(id: string, dueDate: string, type: Task["type"] = "revisar"): Task {
  return { id, type, entityCode: null, title: id, versionNo: null, detail: null, dueDate, assigneePositionName: "Cargo", originName: null, href: "/app" }
}
