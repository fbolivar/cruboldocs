"use server"

// Mutaciones (Server Actions). ⚠️ Hoy simulan la respuesta sin persistir (MOCK);
// en la fase backend conservan su firma y escriben en Supabase con RLS, triggers
// de segregación e inmutabilidad, audit_log y outbox de correo.

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { DEMO_SCENARIO_COOKIE, DEMO_USER_COOKIE, type DemoScenario, demoUser } from "@/lib/data/demo"
import { demoUsers, documents } from "@/lib/data/mock-data"
import { listAllDocuments, listAllRisks, listAuditLog, searchDocuments } from "@/lib/data/queries"
import { DOCUMENT_STATUS_META, segregationError } from "@/lib/domain/documents"
import { RISK_LEVEL_LABELS } from "@/lib/domain/risk"
import { toCsv } from "@/lib/csv"
import { formatDate, formatDateTime, todayIsoDate } from "@/lib/format"
import type {
  AuditFilters,
  ControlType,
  DocumentFilters,
  DocumentSummary,
  EvidenceResult,
  Result,
  RiskFilters,
} from "@/lib/types"

const latency = () => new Promise((r) => setTimeout(r, 600))
const ok = <T,>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })

// ---------- Acceso ----------

export async function login(email: string, password: string): Promise<Result> {
  await latency()
  const match = demoUsers.find((d) => d.user.email === email.trim().toLowerCase())
  if (!match || password.length < 1 || password === "incorrecta") {
    return fail("Correo o contraseña incorrectos.")
  }
  ;(await cookies()).set(DEMO_USER_COOKIE, match.user.id, { httpOnly: true, sameSite: "lax", path: "/" })
  return ok(undefined)
}

export async function logout(): Promise<void> {
  ;(await cookies()).delete(DEMO_USER_COOKIE)
  redirect("/login")
}

/** Respuesta siempre genérica: no revela si el correo existe. */
export async function requestPasswordReset(_email: string): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function acceptInvitation(
  token: string,
  input: { fullName: string; password: string; acceptsDataPolicy: boolean }
): Promise<Result> {
  await latency()
  if (token === "vencida") return fail("Esta invitación venció o ya fue usada.")
  if (!input.acceptsDataPolicy) return fail("Debes aceptar la política de tratamiento de datos.")
  if (input.password.length < 10) return fail("La contraseña debe tener al menos 10 caracteres.")
  return ok(undefined)
}

// ---------- Búsqueda y exportaciones ----------

export async function searchDocumentsAction(q: string): Promise<DocumentSummary[]> {
  return searchDocuments(q)
}

export async function exportDocumentsCsv(filters: DocumentFilters): Promise<string> {
  const rows = await listAllDocuments(filters)
  return toCsv(rows, [
    { header: "Código", value: (d) => d.code },
    { header: "Título", value: (d) => d.title },
    { header: "Proceso", value: (d) => d.processName },
    { header: "Tipo", value: (d) => d.typeCode },
    { header: "Versión", value: (d) => d.currentVersionNo },
    { header: "Estado", value: (d) => DOCUMENT_STATUS_META[d.status].label },
    { header: "Próxima revisión", value: (d) => (d.nextReviewDate ? formatDate(d.nextReviewDate) : null) },
    { header: "Revisión vencida", value: (d) => (d.reviewOverdue ? "Sí" : "No") },
  ])
}

export async function exportRisksCsv(filters: RiskFilters): Promise<string> {
  const rows = await listAllRisks(filters)
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Descripción", value: (r) => r.description },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Categoría", value: (r) => r.category },
    { header: "Causa", value: (r) => r.cause },
    { header: "Consecuencia", value: (r) => r.consequence },
    { header: "Dueño", value: (r) => r.ownerPositionName },
    { header: "Inherente", value: (r) => `${RISK_LEVEL_LABELS[r.inherent.level]} (${r.inherent.score})` },
    { header: "Residual", value: (r) => (r.residual ? `${RISK_LEVEL_LABELS[r.residual.level]} (${r.residual.score})` : null) },
    { header: "Controles", value: (r) => r.controlCount },
    { header: "Controles vencidos", value: (r) => r.overdueControlCount },
  ])
}

export async function exportAuditCsv(filters: AuditFilters): Promise<string> {
  const rows = await listAuditLog(filters)
  return toCsv(rows, [
    { header: "Fecha", value: (e) => formatDateTime(e.at) },
    { header: "Actor", value: (e) => e.actorName },
    { header: "Acción", value: (e) => e.action },
    { header: "Entidad", value: (e) => e.entityType },
    { header: "Registro", value: (e) => e.entityLabel },
    { header: "Cambios", value: (e) => JSON.stringify(e.diff) },
  ])
}

// ---------- Documentos ----------

export interface RegisterDocumentInput {
  processId: string
  typeId: string
  title: string
  code: string
  elaboradorPositionId: string
  revisorPositionId: string
  aprobadorPositionId: string
  distributionPositionIds: string[]
  readRequired: boolean
  reviewEveryMonths: number
  changeSummary: string
  pdfFileName: string
  sourceFileName: string
  submitForReview: boolean
}

export async function registerDocument(input: RegisterDocumentInput): Promise<Result<{ id: string; code: string }>> {
  await latency()
  if (documents.some((d) => d.code === input.code.trim().toUpperCase())) {
    return fail(`El código ${input.code} ya existe. Usa otro consecutivo.`)
  }
  const seg = segregationError(input.elaboradorPositionId, input.revisorPositionId, input.aprobadorPositionId)
  if (seg) return fail(seg)
  if (!input.pdfFileName || !input.sourceFileName) return fail("Adjunta el PDF y el archivo fuente.")
  return ok({ id: "doc-pr-gc-003", code: input.code.trim().toUpperCase() })
}

export async function submitForReview(_documentId: string, _versionNo: number): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function signVersion(input: {
  documentId: string
  versionNo: number
  action: "revision" | "aprobacion"
  password: string
}): Promise<Result<{ signedAt: string }>> {
  await latency()
  const user = await demoUser()
  // Demostración: la contraseña "incorrecta" simula fallo de reautenticación.
  if (!input.password || input.password === "incorrecta") {
    return fail("La contraseña no es correcta. La firma no se registró.")
  }
  if (user.positionId === "pos-coord-calidad") {
    return fail("No puedes firmar un documento que elaboraste o revisaste.")
  }
  return ok({ signedAt: new Date().toISOString() })
}

export async function returnVersion(_documentId: string, _versionNo: number, reason: string): Promise<Result> {
  await latency()
  if (reason.trim().length < 10) return fail("Explica el motivo en al menos 10 caracteres.")
  return ok(undefined)
}

export async function confirmRead(_documentId: string, _versionNo: number): Promise<Result<{ at: string }>> {
  await latency()
  return ok({ at: new Date().toISOString() })
}

export async function requestUpdate(_documentId: string, reason: string): Promise<Result> {
  await latency()
  if (reason.trim().length < 10) return fail("Explica el motivo en al menos 10 caracteres.")
  return ok(undefined)
}

export async function resolveChangeRequest(_requestId: string, accept: boolean, resolution: string): Promise<Result> {
  await latency()
  if (!accept && resolution.trim().length < 10) return fail("Explica por qué se rechaza en al menos 10 caracteres.")
  return ok(undefined)
}

export async function addComment(_versionId: string, body: string): Promise<Result<{ id: string; at: string }>> {
  await latency()
  if (!body.trim()) return fail("Escribe el comentario antes de enviarlo.")
  return ok({ id: `c-${Date.now()}`, at: new Date().toISOString() })
}

export async function resolveComment(_commentId: string): Promise<Result<{ at: string }>> {
  await latency()
  return ok({ at: new Date().toISOString() })
}

// ---------- Riesgos ----------

export async function registerEvidence(input: {
  controlId: string
  executedAt: string
  result: EvidenceResult
  notes: string
  fileName: string | null
}): Promise<Result> {
  await latency()
  if (!input.executedAt) return fail("Indica la fecha de ejecución.")
  if (input.executedAt > todayIsoDate()) return fail("La fecha de ejecución no puede ser futura.")
  return ok(undefined)
}

export interface CreateRiskInput {
  processId: string
  description: string
  cause: string
  consequence: string
  category: string
  ownerPositionId: string
  probability: number
  impact: number
  controls: { description: string; type: ControlType; frequency: string; responsiblePositionId: string }[]
}

export async function createRisk(input: CreateRiskInput): Promise<Result<{ id: string; code: string }>> {
  await latency()
  if (!input.description.trim()) return fail("Describe el riesgo.")
  return ok({ id: "risk-r-07", code: "R-68" })
}

export async function addAssessment(_riskId: string, _kind: "inherente" | "residual", _p: number, _i: number): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function addControl(
  _riskId: string,
  _control: { description: string; type: ControlType; frequency: string; responsiblePositionId: string }
): Promise<Result> {
  await latency()
  return ok(undefined)
}

// ---------- Administración ----------

export async function inviteUser(input: {
  email: string
  positionId: string
  isExternal: boolean
  validUntil: string | null
  isOrgAdmin: boolean
}): Promise<Result> {
  await latency()
  if (input.email.trim().toLowerCase() === "laura.gomez@acme.co") return fail("Este correo ya pertenece a la organización.")
  if (input.isExternal && !input.validUntil) return fail("Indica hasta cuándo tendrá acceso el usuario externo.")
  return ok(undefined)
}

export async function resendInvitation(_membershipId: string): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function revokeAccess(_membershipId: string): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function updateMembership(
  _membershipId: string,
  _changes: { positionId?: string; validUntil?: string | null }
): Promise<Result> {
  await latency()
  return ok(undefined)
}

export async function saveRecertDecisions(decisions: { membershipId: string; keep: boolean }[]): Promise<Result<{ count: number }>> {
  await latency()
  return ok({ count: decisions.length })
}

export async function saveProcess(input: { id?: string; code: string; name: string; type: string; leaderPositionId: string | null }): Promise<Result> {
  await latency()
  if (!input.code.trim() || !input.name.trim()) return fail("Completa el código y el nombre del proceso.")
  return ok(undefined)
}

/** Solo procesos sin documentos (en backend lo refuerza la FK de documents). */
export async function deleteProcess(processId: string): Promise<Result> {
  await latency()
  if (documents.some((d) => d.processId === processId)) {
    return fail("No puedes eliminar un proceso que tiene documentos. Reasígnalos primero.")
  }
  return ok(undefined)
}

export async function saveDocumentType(input: { id?: string; code: string; name: string }): Promise<Result> {
  await latency()
  if (!/^[A-Z]{2,3}$/.test(input.code)) return fail("El código debe tener 2 o 3 letras mayúsculas (p. ej. PR).")
  return ok(undefined)
}

export async function savePosition(input: {
  id?: string
  name: string
  processId: string | null
  roles: { role: string; processId: string | null }[]
}): Promise<Result> {
  await latency()
  if (!input.name.trim()) return fail("Escribe el nombre del cargo.")
  return ok(undefined)
}

export async function createOrganization(input: { name: string; nit: string; adminEmail: string }): Promise<Result> {
  await latency()
  if (!/^\d{9}-\d$/.test(input.nit.trim())) return fail("El NIT debe tener 9 dígitos y su dígito de verificación (900123456-7).")
  return ok(undefined)
}

// ---------- Solo desarrollo ----------

export async function setDemoUser(userId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") return
  ;(await cookies()).set(DEMO_USER_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" })
}

export async function setDemoScenario(scenario: DemoScenario): Promise<void> {
  if (process.env.NODE_ENV === "production") return
  ;(await cookies()).set(DEMO_SCENARIO_COOKIE, scenario, { httpOnly: true, sameSite: "lax", path: "/" })
}
