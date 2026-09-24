// ⚠️ DATOS DE EJEMPLO (MOCK). Se reemplazan por Supabase en la fase backend.
// Tienen la misma forma que src/lib/types.ts. Las fechas son relativas a hoy
// para que vencimientos y alertas se calculen de verdad.

import { riskLevel, riskScore } from "@/lib/domain/risk"
import type {
  ActivityEvent,
  AuditEntry,
  ChangeRequest,
  Control,
  CurrentUser,
  DocumentDetail,
  DocumentStatus,
  DocumentSummary,
  DocumentType,
  DocumentVersion,
  Invitation,
  Member,
  Organization,
  PersonRef,
  Position,
  PositionRole,
  Process,
  RecertificationItem,
  Risk,
  RiskAssessment,
  Task,
} from "@/lib/types"

const DAY = 86_400_000
/** Fecha ISO a `days` días de hoy (a la hora indicada, hora local). */
export function day(days: number, hour = 9, minute = 0): string {
  const d = new Date(Date.now() + days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const MOCK_PDF_URL = "/mock/documento-ejemplo.pdf"

// ---------- Organización ----------

export const ORG = { id: "org-acme", name: "Acme S.A.S." }
const ORG_2 = { id: "org-valle", name: "Industrias del Valle S.A." }

export const organizations: Organization[] = [
  { id: ORG.id, name: ORG.name, nit: "900123456-7", status: "activa", userCount: 8, createdAt: day(-120) },
  { id: ORG_2.id, name: ORG_2.name, nit: "890456789-1", status: "activa", userCount: 23, createdAt: day(-60) },
  { id: "org-andes", name: "Logística Andes S.A.S.", nit: "901765432-5", status: "suspendida", userCount: 4, createdAt: day(-200) },
]

// ---------- Procesos y tipos ----------

const P = (id: string, code: string, name: string, type: Process["type"], leader: string | null): Process => ({
  id, code, name, type, leaderPositionId: leader, leaderPositionName: null, documentCount: 0,
})

export const processes: Process[] = [
  P("proc-dir", "DE", "Dirección", "estrategico", "pos-gerente"),
  P("proc-sig", "GC", "Gestión SIG", "estrategico", "pos-lider-sig"),
  P("proc-com", "CO", "Comercial", "misional", null),
  P("proc-ope", "OP", "Operaciones", "misional", null),
  P("proc-cmp", "CP", "Compras", "misional", "pos-lider-compras"),
  P("proc-th", "TH", "Talento humano", "apoyo", null),
  P("proc-ti", "TI", "TI", "apoyo", "pos-coord-ti"),
  P("proc-fin", "FI", "Financiera", "apoyo", null),
  P("proc-aud", "AI", "Auditoría interna", "evaluacion", "pos-auditor"),
  P("proc-mej", "ME", "Mejora", "evaluacion", "pos-lider-sig"),
]

export const documentTypes: DocumentType[] = [
  { id: "t-ma", code: "MA", name: "Manual", documentCount: 0 },
  { id: "t-pr", code: "PR", name: "Procedimiento", documentCount: 0 },
  { id: "t-in", code: "IN", name: "Instructivo", documentCount: 0 },
  { id: "t-fo", code: "FO", name: "Formato", documentCount: 0 },
  { id: "t-po", code: "PO", name: "Política", documentCount: 0 },
  { id: "t-ca", code: "CA", name: "Caracterización", documentCount: 0 },
]

// ---------- Cargos, personas y usuarios de demostración ----------

const R = (role: PositionRole["role"], processId: string | null = null): PositionRole => ({ role, processId })

export const positions: Position[] = [
  { id: "pos-coord-calidad", name: "Coordinador de Calidad", processId: "proc-sig", processName: "Gestión SIG", roles: [R("elaborador"), R("lider_proceso", "proc-sig")], holders: [] },
  { id: "pos-lider-sig", name: "Líder SIG", processId: "proc-sig", processName: "Gestión SIG", roles: [R("lider_sig"), R("revisor")], holders: [] },
  { id: "pos-gerente", name: "Gerente General", processId: "proc-dir", processName: "Dirección", roles: [R("aprobador"), R("lider_proceso", "proc-dir")], holders: [] },
  { id: "pos-coord-ti", name: "Coordinador de TI", processId: "proc-ti", processName: "TI", roles: [R("elaborador", "proc-ti"), R("lider_proceso", "proc-ti"), R("responsable_control", "proc-ti")], holders: [] },
  { id: "pos-lider-compras", name: "Líder de Compras", processId: "proc-cmp", processName: "Compras", roles: [R("lider_proceso", "proc-cmp"), R("responsable_control", "proc-cmp")], holders: [] },
  { id: "pos-auditor", name: "Auditor externo", processId: "proc-aud", processName: "Auditoría interna", roles: [R("auditor")], holders: [] },
  { id: "pos-analista", name: "Analista administrativo", processId: "proc-fin", processName: "Financiera", roles: [R("consulta")], holders: [] },
  { id: "pos-jefe-admin", name: "Jefe administrativo", processId: null, processName: null, roles: [], holders: [] },
  { id: "pos-consultor", name: "Consultor externo", processId: null, processName: null, roles: [R("consulta")], holders: [] },
]

const pos = (id: string) => positions.find((p) => p.id === id) as Position

interface DemoUser {
  user: CurrentUser
  label: string
}

function demoUser(
  id: string, fullName: string, email: string, positionId: string | null,
  extra: Partial<Pick<CurrentUser, "isOrgAdmin" | "isPlatformAdmin" | "isExternal" | "validUntil">> = {}
): CurrentUser {
  const p = positionId ? pos(positionId) : null
  return {
    id, fullName, email,
    positionId, positionName: p?.name ?? null,
    organization: ORG,
    organizations: extra.isPlatformAdmin ? [ORG, ORG_2] : [ORG],
    isOrgAdmin: extra.isOrgAdmin ?? false,
    isPlatformAdmin: extra.isPlatformAdmin ?? false,
    isExternal: extra.isExternal ?? false,
    validUntil: extra.validUntil ?? null,
    roles: p?.roles ?? [],
  }
}

/** Usuarios para el selector "Ver como" (solo desarrollo). El primero es el predeterminado. */
export const demoUsers: DemoUser[] = [
  { label: "Coordinadora de Calidad · Admin", user: demoUser("u-laura", "Laura Gómez", "laura.gomez@acme.co", "pos-coord-calidad", { isOrgAdmin: true }) },
  { label: "Líder SIG · revisor", user: demoUser("u-juan", "Juan Pérez", "juan.perez@acme.co", "pos-lider-sig") },
  { label: "Gerente General · aprobador", user: demoUser("u-carlos", "Carlos Rojas", "carlos.rojas@acme.co", "pos-gerente") },
  { label: "Coordinadora de TI · responsable de control", user: demoUser("u-diana", "Diana Torres", "diana.torres@acme.co", "pos-coord-ti") },
  { label: "Auditor externo", user: demoUser("u-andres", "Andrés Ruiz", "aruiz@auditores.co", "pos-auditor", { isExternal: true, validUntil: day(99) }) },
  { label: "Analista · consulta", user: demoUser("u-sofia", "Sofía Vargas", "sofia.vargas@acme.co", "pos-analista") },
  { label: "Admin sin rol funcional (solo metadatos)", user: demoUser("u-oscar", "Óscar Mejía", "oscar.mejia@acme.co", "pos-jefe-admin", { isOrgAdmin: true }) },
  { label: "Superadministrador Crubol", user: demoUser("u-crubol", "Soporte Crubol", "soporte@crubol.co", null, { isPlatformAdmin: true }) },
]

export const people: Record<string, PersonRef> = Object.fromEntries(
  demoUsers
    .filter((d) => d.user.positionName)
    .map((d) => [d.user.id, { id: d.user.id, fullName: d.user.fullName, positionName: d.user.positionName as string }])
)
for (const d of demoUsers) {
  if (d.user.positionId) pos(d.user.positionId).holders.push(people[d.user.id])
}
const laura = people["u-laura"]
const juan = people["u-juan"]
const carlos = people["u-carlos"]
const diana = people["u-diana"]
const andres = people["u-andres"]

// ---------- Documentos ----------

const proc = (id: string) => processes.find((p) => p.id === id) as Process
const type = (code: string) => documentTypes.find((t) => t.code === code) as DocumentType

function summary(
  id: string, code: string, title: string, processId: string, status: DocumentStatus,
  versionNo: number, nextReviewDays: number | null
): DocumentSummary {
  return {
    id, code, title, processId, processName: proc(processId).name,
    typeId: type(code.split("-")[0]).id, typeCode: code.split("-")[0],
    status, currentVersionNo: versionNo,
    nextReviewDate: nextReviewDays === null ? null : day(nextReviewDays),
    reviewOverdue: nextReviewDays !== null && nextReviewDays < 0 && status === "vigente",
  }
}

const featured: DocumentSummary[] = [
  summary("doc-ma-sig-001", "MA-SIG-001", "Manual del Sistema Integrado de Gestión", "proc-sig", "vigente", 7, -21),
  summary("doc-pr-gc-001", "PR-GC-001", "Auditorías internas", "proc-sig", "vigente", 3, 109),
  summary("doc-pr-gc-002", "PR-GC-002", "Acciones correctivas y de mejora", "proc-sig", "vigente", 5, 158),
  summary("doc-pr-gc-003", "PR-GC-003", "Control de documentos y registros", "proc-sig", "en_aprobacion", 4, 173),
  summary("doc-pr-gc-004", "PR-GC-004", "Revisión por la dirección", "proc-sig", "en_revision", 1, null),
  summary("doc-fo-gc-010", "FO-GC-010", "Formato de solicitud de cambio documental", "proc-sig", "borrador", 2, null),
  summary("doc-in-gc-002", "IN-GC-002", "Instructivo de codificación de documentos", "proc-sig", "vigente", 2, 68),
  summary("doc-pr-gc-009", "PR-GC-009", "Gestión de quejas (derogado)", "proc-sig", "obsoleto", 2, null),
  summary("doc-fo-co-012", "FO-CO-012", "Evaluación de proveedores", "proc-cmp", "en_revision", 2, null),
  summary("doc-in-ti-004", "IN-TI-004", "Gestión de contraseñas", "proc-ti", "vigente", 2, 20),
]

const filler: [string, string, string, number][] = [
  ["PO-DE-001", "Política del sistema integrado de gestión", "proc-dir", 240],
  ["CA-DE-001", "Caracterización del proceso de Dirección", "proc-dir", 200],
  ["PR-DE-002", "Planeación estratégica", "proc-dir", 12],
  ["CA-CO-001", "Caracterización del proceso Comercial", "proc-com", 150],
  ["PR-CO-003", "Elaboración de cotizaciones", "proc-com", 90],
  ["PR-OP-001", "Planificación de la producción", "proc-ope", 60],
  ["IN-OP-004", "Inspección de producto terminado", "proc-ope", 25],
  ["FO-OP-007", "Registro de no conformidades de producto", "proc-ope", 300],
  ["PR-OP-010", "Control de equipos de medición", "proc-ope", -5],
  ["PR-CP-001", "Selección y evaluación de proveedores", "proc-cmp", 130],
  ["FO-CP-003", "Orden de compra", "proc-cmp", 210],
  ["PR-TH-001", "Selección y contratación de personal", "proc-th", 80],
  ["FO-TH-005", "Evaluación de desempeño", "proc-th", 170],
  ["IN-TH-002", "Inducción y reinducción", "proc-th", 28],
  ["PR-TI-001", "Copias de respaldo y restauración", "proc-ti", 45],
  ["PO-TI-002", "Política de seguridad de la información", "proc-ti", 190],
  ["PR-FI-001", "Gestión de pagos a proveedores", "proc-fin", 100],
  ["PR-AI-001", "Programa anual de auditorías", "proc-aud", 70],
  ["FO-AI-002", "Informe de auditoría interna", "proc-aud", 260],
  ["PR-ME-001", "Gestión del cambio", "proc-mej", 140],
]

export const documents: DocumentSummary[] = [
  ...featured,
  ...filler.map(([code, title, processId, review]) =>
    summary(`doc-${code.toLowerCase()}`, code, title, processId, "vigente", 1 + (code.length % 3), review)
  ),
].sort((a, b) => a.code.localeCompare(b.code))

for (const p of processes) p.documentCount = documents.filter((d) => d.processId === p.id).length
for (const t of documentTypes) t.documentCount = documents.filter((d) => d.typeId === t.id).length
for (const p of processes) p.leaderPositionName = p.leaderPositionId ? pos(p.leaderPositionId).name : null

const SHA = "3fa9e1c07b2d4e5f9a1b8c6d2e0f4a7b9c3d5e1f0a2b4c6d8e0f1a3b5c7a81e0d77c21"
const DISTRIBUTION = ["pos-coord-calidad", "pos-lider-sig", "pos-gerente", "pos-coord-ti", "pos-lider-compras", "pos-analista"]

function readsFor(acknowledged: string[]): DocumentVersion["reads"] {
  return demoUsers
    .filter((d) => d.user.positionId && DISTRIBUTION.includes(d.user.positionId))
    .map((d) => ({
      userId: d.user.id,
      positionName: d.user.positionName as string,
      userName: d.user.fullName,
      acknowledgedAt: acknowledged.includes(d.user.id) ? day(-3, 10, 15) : null,
    }))
}

let versionSeq = 0

function version(
  versionNo: number, status: DocumentVersion["status"], changeSummary: string,
  opts: Partial<DocumentVersion> = {}
): DocumentVersion {
  return {
    id: `ver-${++versionSeq}`,
    versionNo, status, changeSummary,
    pdfUrl: MOCK_PDF_URL, sourceUrl: MOCK_PDF_URL, sourceFileName: `v${versionNo}.docx`,
    pdfSha256: SHA, pageCount: 3,
    elaboratedBy: laura, reviewedBy: null, approvedBy: null, approvedAt: null, effectiveDate: null,
    comments: [], signatures: [], reads: [],
    ...opts,
  }
}

function approved(versionNo: number, status: "aprobada" | "reemplazada", daysAgo: number, summary: string): DocumentVersion {
  return version(versionNo, status, summary, {
    reviewedBy: juan, approvedBy: carlos, approvedAt: day(-daysAgo, 16, 40), effectiveDate: day(-daysAgo + 1),
    signatures: [
      { id: `s-r-${versionNo}`, signer: juan, action: "revision", meaning: "Revisé este documento y es técnicamente correcto.", signedAt: day(-daysAgo - 2, 11, 5), ip: "190.85.12.44", signatureHash: "b71c09e4d2a8f3c1" },
      { id: `s-a-${versionNo}`, signer: carlos, action: "aprobacion", meaning: "Apruebo este documento para su uso en la organización.", signedAt: day(-daysAgo, 16, 40), ip: "190.85.12.51", signatureHash: "e4a2c7b90f13d5a8" },
    ],
    reads: readsFor(["u-juan", "u-carlos", "u-diana", "u-sofia"]),
  })
}

const baseDetail = (s: DocumentSummary) => ({
  ...s,
  typeName: type(s.typeCode).name,
  elaboradorPositionId: "pos-coord-calidad", elaboradorPositionName: "Coordinador de Calidad",
  revisorPositionId: "pos-lider-sig", revisorPositionName: "Líder SIG",
  aprobadorPositionId: "pos-gerente", aprobadorPositionName: "Gerente General",
  reviewEveryMonths: 12, readRequired: true,
  distributionPositionIds: DISTRIBUTION, distributionCount: 24,
  changeRequests: [] as ChangeRequest[],
})

const featuredVersions: Record<string, DocumentVersion[]> = {
  "doc-pr-gc-003": [
    version(4, "en_aprobacion", "Se agrega la tabla de responsables de aprobación por tipo de documento.", {
      reviewedBy: juan,
      comments: [
        { id: "c1", author: juan, body: "En el numeral 5.1 falta indicar quién aprueba los formatos (FO). Sugiero agregar la tabla de responsables por tipo.", createdAt: day(-3, 10, 12), resolvedAt: day(-3, 15, 40) },
        { id: "c2", author: laura, body: "Agregada la tabla en la página 3. Queda lista para revisión.", createdAt: day(-3, 15, 40), resolvedAt: null },
        { id: "c3", author: juan, body: "Revisado. Paso a aprobación.", createdAt: day(-2, 9, 30), resolvedAt: null },
      ],
      signatures: [{ id: "s-r-4", signer: juan, action: "revision", meaning: "Revisé este documento y es técnicamente correcto.", signedAt: day(-2, 9, 31), ip: "190.85.12.44", signatureHash: "9c2d7f0a1b3e5c84" }],
    }),
    approved(3, "aprobada", 190, "Actualización de tiempos de retención de registros."),
    approved(2, "reemplazada", 420, "Inclusión de documentos externos."),
    approved(1, "reemplazada", 700, "Creación del documento."),
  ],
  "doc-ma-sig-001": [
    approved(7, "aprobada", 20, "Actualización del alcance y del mapa de procesos."),
    approved(6, "reemplazada", 380, "Ajustes por auditoría de seguimiento."),
  ],
  "doc-pr-gc-004": [
    version(1, "en_revision", "Creación del documento.", { elaboratedBy: laura }),
  ],
  "doc-fo-gc-010": [
    version(2, "borrador", "Se agrega el campo de justificación del cambio.", {
      comments: [{ id: "c4", author: juan, body: "Falta el campo de firma del solicitante. Devuelvo para corrección.", createdAt: day(-1, 14, 20), resolvedAt: null }],
    }),
    approved(1, "aprobada", 300, "Creación del documento."),
  ],
  "doc-fo-co-012": [version(2, "en_revision", "Nuevos criterios de evaluación ambiental.")],
  "doc-in-ti-004": [
    approved(2, "aprobada", 345, "Longitud mínima de 12 caracteres y doble factor."),
    approved(1, "reemplazada", 700, "Creación del documento."),
  ],
  "doc-pr-gc-009": [approved(2, "reemplazada", 500, "Documento derogado: se integra en PR-GC-002.")],
}

// Lectura pendiente para Laura en el manual vigente.
featuredVersions["doc-ma-sig-001"][0].reads = readsFor(["u-juan", "u-carlos"])

const changeRequests: Record<string, ChangeRequest[]> = {
  "doc-in-ti-004": [
    { id: "cr1", requestedBy: carlos, reason: "La política corporativa ahora exige cambio de contraseña cada 90 días; el instructivo dice 180.", status: "abierta", createdAt: day(-2, 8, 50), resolvedBy: null, resolution: null },
  ],
  "doc-ma-sig-001": [
    { id: "cr2", requestedBy: diana, reason: "Incluir el proceso de TI en el mapa de procesos.", status: "aceptada", createdAt: day(-60), resolvedBy: laura, resolution: "Incluido en la versión 7." },
  ],
}

export function buildDocumentDetail(s: DocumentSummary): DocumentDetail {
  const detail = baseDetail(s)
  if (s.processId === "proc-ti") {
    Object.assign(detail, { elaboradorPositionId: "pos-coord-ti", elaboradorPositionName: "Coordinador de TI" })
  }
  return {
    ...detail,
    versions: featuredVersions[s.id] ?? [approved(s.currentVersionNo, "aprobada", 120, "Actualización periódica.")],
    changeRequests: changeRequests[s.id] ?? [],
  }
}

// ---------- Bandeja ----------

interface MockTask extends Task {
  assigneePositionId: string
}

const T = (
  id: string, type: Task["type"], assignee: string, dueDays: number, title: string,
  entityCode: string | null, versionNo: number | null, originName: string | null, href: string, detail: string | null = null
): MockTask => ({
  id, type, assigneePositionId: assignee, assigneePositionName: pos(assignee).name,
  dueDate: day(dueDays, 18), title, entityCode, versionNo, originName, href, detail,
})

export const tasks: MockTask[] = [
  T("t1", "aprobar", "pos-gerente", -2, "Control de documentos y registros", "PR-GC-003", 4, "Juan Pérez", "/app/documentos/doc-pr-gc-003"),
  T("t2", "recertificar_accesos", "pos-coord-calidad", -1, "Recertificación semestral", null, null, null, "/app/admin?tab=recertificacion", "12 accesos"),
  T("t3", "revisar", "pos-lider-sig", 0, "Evaluación de proveedores", "FO-CO-012", 2, "Laura Gómez", "/app/documentos/doc-fo-co-012"),
  T("t4", "confirmar_lectura", "pos-coord-calidad", 5, "Manual del Sistema Integrado de Gestión", "MA-SIG-001", 7, null, "/app/documentos/doc-ma-sig-001"),
  T("t5", "ejecutar_control", "pos-coord-ti", -8, "Prueba mensual de restauración", "R-07", null, null, "/app/riesgos?riesgo=risk-r-07"),
  T("t6", "atender_solicitud", "pos-coord-ti", 12, "Gestión de contraseñas", "IN-TI-004", 2, "Carlos Rojas", "/app/documentos/doc-in-ti-004"),
  T("t7", "revisar", "pos-lider-sig", 3, "Revisión por la dirección", "PR-GC-004", 1, "Laura Gómez", "/app/documentos/doc-pr-gc-004"),
  T("t8", "corregir", "pos-coord-calidad", 2, "Formato de solicitud de cambio documental", "FO-GC-010", 2, "Juan Pérez", "/app/documentos/doc-fo-gc-010"),
  T("t9", "revisar_documento_vencido", "pos-coord-calidad", -21, "Manual del Sistema Integrado de Gestión", "MA-SIG-001", 7, null, "/app/documentos/doc-ma-sig-001"),
  T("t10", "confirmar_lectura", "pos-coord-ti", 5, "Manual del Sistema Integrado de Gestión", "MA-SIG-001", 7, null, "/app/documentos/doc-ma-sig-001"),
  T("t11", "confirmar_lectura", "pos-analista", 5, "Manual del Sistema Integrado de Gestión", "MA-SIG-001", 7, null, "/app/documentos/doc-ma-sig-001"),
  T("t12", "ejecutar_control", "pos-coord-ti", 1, "Copia automática diaria en nube", "R-07", null, null, "/app/riesgos?riesgo=risk-r-07"),
  T("t13", "ejecutar_control", "pos-lider-compras", 9, "Evaluación previa de proveedores nuevos", "R-03", null, null, "/app/riesgos?riesgo=risk-r-03"),
]

export const activity: ActivityEvent[] = [
  { id: "a1", actorName: "Juan Pérez", description: "firmó la revisión de", entityCode: "PR-GC-003", at: day(-2, 9, 31) },
  { id: "a2", actorName: "Juan Pérez", description: "devolvió con comentarios", entityCode: "FO-GC-010", at: day(-1, 14, 20) },
  { id: "a3", actorName: "Carlos Rojas", description: "solicitó actualizar", entityCode: "IN-TI-004", at: day(-2, 8, 50) },
  { id: "a4", actorName: "Andrés Ruiz", description: "registró evidencia (efectivo) en", entityCode: "R-03", at: day(-1, 9, 15) },
  { id: "a5", actorName: "Laura Gómez", description: "envió a revisión", entityCode: "PR-GC-004", at: day(-4, 11, 2) },
  { id: "a6", actorName: "Carlos Rojas", description: "aprobó", entityCode: "MA-SIG-001", at: day(-20, 16, 40) },
]

// ---------- Riesgos ----------

function assessment(id: string, kind: RiskAssessment["kind"], p: number, i: number, by: PersonRef, daysAgo: number): RiskAssessment {
  const score = riskScore(p, i)
  return { id, kind, probability: p, impact: i, score, level: riskLevel(score), assessedBy: by, assessedAt: day(-daysAgo) }
}

function control(
  id: string, description: string, t: Control["type"], frequency: string, responsible: string,
  dueDays: number, last: Control["lastEvidence"]
): Control {
  return {
    id, description, type: t, frequency,
    responsiblePositionId: responsible, responsiblePositionName: pos(responsible).name,
    nextDueDate: day(dueDays), overdue: dueDays < 0, lastEvidence: last,
  }
}

function risk(
  id: string, code: string, description: string, processId: string, category: string,
  cause: string, consequence: string, owner: string,
  assessments: RiskAssessment[], controls: Control[]
): Risk {
  const inh = assessments.find((a) => a.kind === "inherente") as RiskAssessment
  const res = assessments.find((a) => a.kind === "residual") ?? null
  return {
    id, code, description, processId, processName: proc(processId).name, category,
    inherent: { score: inh.score, level: inh.level },
    residual: res && { score: res.score, level: res.level },
    controlCount: controls.length,
    overdueControlCount: controls.filter((c) => c.overdue).length,
    cause, consequence, ownerPositionName: pos(owner).name, status: "activo",
    assessments, controls,
  }
}

const featuredRisks: Risk[] = [
  risk("risk-r-12", "R-12", "Incumplimiento de requisitos legales ambientales", "proc-ope", "Cumplimiento",
    "Desconocimiento de cambios normativos.", "Sanciones y cierre temporal de la planta.", "pos-gerente",
    [assessment("a12r", "residual", 4, 5, juan, 30), assessment("a12i", "inherente", 5, 5, juan, 200)],
    [control("c12a", "Revisión trimestral de la matriz legal", "preventivo", "Trimestral", "pos-lider-sig", 40, null)]),
  risk("risk-r-07", "R-07", "Pérdida de información por falla en copias de respaldo", "proc-ti", "Seguridad de la información",
    "Copias sin verificación de restauración.", "Interrupción de operaciones y pérdida de registros.", "pos-coord-ti",
    [
      assessment("a7r2", "residual", 3, 4, diana, 15),
      assessment("a7r1", "residual", 4, 4, diana, 190),
      assessment("a7i", "inherente", 4, 5, diana, 400),
    ],
    [
      control("c7a", "Prueba mensual de restauración", "detectivo", "Mensual", "pos-coord-ti", -8,
        { id: "e7a", executedAt: day(-38), result: "efectivo", notes: "Restauración completa en 42 minutos.", fileName: "prueba-restauracion.pdf", registeredBy: diana }),
      control("c7b", "Copia automática diaria en nube", "preventivo", "Diaria", "pos-coord-ti", 1,
        { id: "e7b", executedAt: day(-1), result: "efectivo", notes: "", fileName: "respaldo-log.pdf", registeredBy: diana }),
    ]),
  risk("risk-r-03", "R-03", "Selección de proveedores sin evaluación previa", "proc-cmp", "Operacional",
    "Compras urgentes sin seguir el procedimiento.", "Materia prima no conforme.", "pos-lider-compras",
    [assessment("a3r", "residual", 2, 3, laura, 25), assessment("a3i", "inherente", 4, 4, laura, 300)],
    [
      control("c3a", "Evaluación previa de proveedores nuevos", "preventivo", "Por evento", "pos-lider-compras", 9,
        { id: "e3a", executedAt: day(-1, 9, 15), result: "efectivo", notes: "Proveedor aprobado con 86 puntos.", fileName: "evaluacion-prov.pdf", registeredBy: andres }),
      control("c3b", "Reevaluación anual de proveedores críticos", "detectivo", "Anual", "pos-lider-compras", 120, null),
    ]),
  risk("risk-r-21", "R-21", "Uso de versiones desactualizadas de procedimientos", "proc-sig", "Cumplimiento",
    "Copias impresas y archivos locales.", "No conformidades en auditoría.", "pos-lider-sig",
    [assessment("a21r", "residual", 2, 2, juan, 10), assessment("a21i", "inherente", 4, 3, juan, 250)],
    [
      control("c21a", "Confirmación de lectura obligatoria", "preventivo", "Por versión", "pos-lider-sig", 30, null),
      control("c21b", "Revisión semestral de copias no controladas", "detectivo", "Semestral", "pos-lider-sig", 60, null),
      control("c21c", "Retiro de copias obsoletas", "correctivo", "Por evento", "pos-coord-calidad", 90, null),
    ]),
]

const riskTopics: [string, string, string][] = [
  ["Retraso en entregas a clientes clave", "proc-ope", "Operacional"],
  ["Rotación de personal técnico", "proc-th", "Talento humano"],
  ["Accesos no autorizados a sistemas", "proc-ti", "Seguridad de la información"],
  ["Errores en la facturación", "proc-fin", "Financiero"],
  ["Pérdida de clientes por quejas no atendidas", "proc-com", "Comercial"],
  ["Hallazgos repetidos en auditoría", "proc-aud", "Cumplimiento"],
  ["Desabastecimiento de materia prima", "proc-cmp", "Operacional"],
  ["Accidentes laborales en planta", "proc-ope", "Seguridad y salud"],
  ["Incumplimiento de metas estratégicas", "proc-dir", "Estratégico"],
  ["Acciones de mejora sin cierre eficaz", "proc-mej", "Cumplimiento"],
]

// Pares [P, I] residuales deterministas para completar la matriz de ejemplo.
const cells: [number, number][] = [
  [5, 2], [5, 4], [5, 5], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3], [4, 4], [4, 5], [3, 1], [3, 2], [3, 2],
  [3, 2], [3, 2], [3, 3], [3, 3], [3, 3], [3, 4], [2, 1], [2, 1], [2, 2], [2, 2], [2, 2], [2, 3], [2, 3],
  [2, 4], [2, 4], [2, 5], [1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [1, 3], [1, 3], [1, 4], [5, 4],
]

const generatedRisks: Risk[] = cells.map(([p, i], n) => {
  const [topic, processId, category] = riskTopics[n % riskTopics.length]
  const code = `R-${String(30 + n).padStart(2, "0")}`
  const owner = processes.find((x) => x.id === processId)?.leaderPositionId ?? "pos-lider-sig"
  return risk(`risk-${code.toLowerCase()}`, code, topic, processId, category,
    "Causa registrada en la matriz heredada.", "Consecuencia registrada en la matriz heredada.", owner,
    [assessment(`g${n}r`, "residual", p, i, juan, 40), assessment(`g${n}i`, "inherente", Math.min(5, p + 1), Math.min(5, i + 1), juan, 300)],
    [control(`g${n}c`, "Control documentado en la matriz heredada", "preventivo", "Semestral", owner, n % 7 === 0 ? -3 : 50 + n, null)])
})

export const risks: Risk[] = [...featuredRisks, ...generatedRisks]

// ---------- Administración ----------

export const members: Member[] = [
  { membershipId: "m1", userId: "u-laura", fullName: "Laura Gómez", email: "laura.gomez@acme.co", positionId: "pos-coord-calidad", positionName: "Coordinador de Calidad", isOrgAdmin: true, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-110) },
  { membershipId: "m2", userId: "u-juan", fullName: "Juan Pérez", email: "juan.perez@acme.co", positionId: "pos-lider-sig", positionName: "Líder SIG", isOrgAdmin: false, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-110) },
  { membershipId: "m3", userId: "u-carlos", fullName: "Carlos Rojas", email: "carlos.rojas@acme.co", positionId: "pos-gerente", positionName: "Gerente General", isOrgAdmin: false, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-109) },
  { membershipId: "m4", userId: "u-diana", fullName: "Diana Torres", email: "diana.torres@acme.co", positionId: "pos-coord-ti", positionName: "Coordinador de TI", isOrgAdmin: false, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-100) },
  { membershipId: "m5", userId: "u-andres", fullName: "Andrés Ruiz", email: "aruiz@auditores.co", positionId: "pos-auditor", positionName: "Auditor externo", isOrgAdmin: false, isExternal: true, validUntil: day(99), status: "activo", invitedAt: day(-40) },
  { membershipId: "m6", userId: null, fullName: null, email: "m.diaz@acme.co", positionId: "pos-lider-compras", positionName: "Líder de Compras", isOrgAdmin: false, isExternal: false, validUntil: null, status: "invitado", invitedAt: day(-1) },
  { membershipId: "m7", userId: "u-sofia", fullName: "Sofía Vargas", email: "sofia.vargas@acme.co", positionId: "pos-analista", positionName: "Analista administrativo", isOrgAdmin: false, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-90) },
  { membershipId: "m8", userId: "u-oscar", fullName: "Óscar Mejía", email: "oscar.mejia@acme.co", positionId: "pos-jefe-admin", positionName: "Jefe administrativo", isOrgAdmin: true, isExternal: false, validUntil: null, status: "activo", invitedAt: day(-110) },
  { membershipId: "m9", userId: "u-pedro", fullName: "Pedro Castro", email: "pcastro@consultores.co", positionId: "pos-consultor", positionName: "Consultor externo", isOrgAdmin: false, isExternal: true, validUntil: day(-85), status: "vencido", invitedAt: day(-200) },
]

export const recertification: { periodDays: number; nextDueDate: string; items: RecertificationItem[] } = {
  periodDays: 180,
  nextDueDate: day(-1),
  items: members
    .filter((m) => m.status === "activo")
    .map((m, n) => ({
      membershipId: m.membershipId,
      fullName: m.fullName as string,
      email: m.email,
      positionName: m.positionName,
      isExternal: m.isExternal,
      lastRecertifiedAt: n % 3 === 0 ? null : day(-181 - n),
      dueDate: day(-1 + n * 2),
      overdue: -1 + n * 2 < 0,
    })),
}

export const auditLog: AuditEntry[] = [
  { id: "l1", at: day(-2, 9, 31), actorName: "Juan Pérez", action: "firmar_revision", entityType: "Documento", entityLabel: "PR-GC-003 v4", diff: { estado: { before: "en_revision", after: "en_aprobacion" } } },
  { id: "l2", at: day(-2, 8, 50), actorName: "Carlos Rojas", action: "solicitar_actualizacion", entityType: "Documento", entityLabel: "IN-TI-004", diff: { solicitud: { before: null, after: "abierta" } } },
  { id: "l3", at: day(-1, 14, 20), actorName: "Juan Pérez", action: "devolver", entityType: "Documento", entityLabel: "FO-GC-010 v2", diff: { estado: { before: "en_revision", after: "borrador" } } },
  { id: "l4", at: day(-1, 9, 15), actorName: "Andrés Ruiz", action: "registrar_evidencia", entityType: "Control", entityLabel: "R-03 · Evaluación previa", diff: { resultado: { before: null, after: "efectivo" } } },
  { id: "l5", at: day(-1, 8, 0), actorName: "Laura Gómez", action: "invitar_usuario", entityType: "Membresía", entityLabel: "m.diaz@acme.co", diff: { cargo: { before: null, after: "Líder de Compras" } } },
  { id: "l6", at: day(-4, 11, 2), actorName: "Laura Gómez", action: "enviar_revision", entityType: "Documento", entityLabel: "PR-GC-004 v1", diff: { estado: { before: "borrador", after: "en_revision" } } },
  { id: "l7", at: day(-15, 10, 0), actorName: "Diana Torres", action: "valorar_riesgo", entityType: "Riesgo", entityLabel: "R-07 residual", diff: { probabilidad: { before: "4", after: "3" }, nivel: { before: "alto (16)", after: "alto (12)" } } },
  { id: "l8", at: day(-20, 16, 40), actorName: "Carlos Rojas", action: "firmar_aprobacion", entityType: "Documento", entityLabel: "MA-SIG-001 v7", diff: { estado: { before: "en_aprobacion", after: "vigente" } } },
  { id: "l9", at: day(-85, 0, 5), actorName: "Sistema", action: "vencer_acceso", entityType: "Membresía", entityLabel: "pcastro@consultores.co", diff: { estado: { before: "activo", after: "vencido" } } },
]

export const invitations: Record<string, Invitation> = {
  demo: { organizationName: ORG.name, positionName: "Líder de Compras", email: "m.diaz@acme.co", isExternal: false, validUntil: null, status: "valida" },
  externo: { organizationName: ORG.name, positionName: "Auditor externo", email: "auditor@firma.co", isExternal: true, validUntil: day(99), status: "valida" },
  vencida: { organizationName: ORG.name, positionName: "Analista administrativo", email: "x@acme.co", isExternal: false, validUntil: null, status: "vencida" },
}
