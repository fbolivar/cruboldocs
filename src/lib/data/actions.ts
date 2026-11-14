"use server"

// Mutaciones (Server Actions). Escriben con la sesión del usuario: la RLS y las funciones
// del flujo (security definer) validan rol, estado y segregación. La clave de servidor solo
// se usa donde el diseño lo exige: firma tras reautenticación, invitaciones, alta de
// organizaciones, Storage y outbox de correo. La traza de administración la escribe la base
// (triggers), no la aplicación.

import { randomBytes, randomUUID } from "node:crypto"
import type { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { z } from "zod"

import { parseCsv, toCsv } from "@/lib/csv"
import { newToken, sha256Hex } from "@/lib/data/hash"
import { deliverChat } from "@/lib/chat/deliver"
import { generateDraft, type DraftInput } from "@/lib/agente/content"
import { CHAT_EVENTS, isAllowedChatUrl, sendChat } from "@/lib/chat/providers"
import { DATASET_KEYS, type DatasetKey, type ReportConfig, type ReportRow } from "@/lib/bi/datasets"
import { runConfig, sanitizeConfig, type ReportResult } from "@/lib/bi/compute"
import { getChatNotifierTarget, getCourse, getCurrentUser, getDashboard, getEquipment, getFormTemplate, getProcessMap, getSstEvaluation, getSubmission, isUuid, listAllDocuments, listAllRisks, loadDataset, listApprovalRequests, listAuditLog, listContextIssues, listEnvAspects, listHazards, listIncidents, listInspections, listInterestedParties, listKnowledge, listLegalRequirements, listMinutes, listNcOutputs, listObjectives, listPqrs, listSubmissionsForExport, listSuppliers, listSurveyResponses, searchDocuments } from "@/lib/data/queries"
import { toStoredLayout } from "@/lib/domain/dashboard-blocks"
import { generateApiToken } from "@/lib/api/keys"
import {
  createUploadTicket,
  promoteUpload,
  removeObjects,
  safeFileName,
  stagingPath,
  storedFileMatches,
  UploadError,
  type UploadTicket,
} from "@/lib/data/storage"
import { canManageCatalog, canManageNonconformities } from "@/lib/domain/access"
import { IMPORT_ENTITIES, isImportEntity, type ImportEntity } from "@/lib/import/schema"
import { DOCUMENT_STATUS_META, SIGNATURE_MEANING, segregationError } from "@/lib/domain/documents"
import { downloadName, EVIDENCE_EXT, isEvidenceName, isPdfName, isSourceName, SOURCE_EXT } from "@/lib/domain/files"
import { RISK_LEVEL_LABELS } from "@/lib/domain/risk"
import { flushOutbox, smtpConfigured } from "@/lib/email/outbox"
import { formatDate, formatDateTime, todayIsoDate } from "@/lib/format"
import { clientIp } from "@/lib/security/client-ip"
import { ipKey, TOO_MANY, withinLimits } from "@/lib/security/rate-limit"
import { CAPTCHA_FAILED, verifyTurnstile } from "@/lib/security/turnstile"
import { createAdminClient, createAuthClient, createClient, createEphemeralClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import type {
  AuditFilters,
  ApiKeyCreated,
  ImportPreviewRow,
  ImportResult,
  WebhookCreated,
  ControlType,
  CourseAttemptResult,
  CurrentUser,
  DocumentFilters,
  DocumentStatus,
  DocumentSummary,
  EvidenceResult,
  FieldValue,
  SubmissionDetail,
  Result,
  RiskFilters,
  RiskLevel,
} from "@/lib/types"

const ok = <T,>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })
const GENERIC = "No pudimos completar la acción. Inténtalo de nuevo en unos minutos."
const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")

/** Mensaje para el usuario a partir del error de la base (las funciones del flujo ya lo redactan). */
function dbMessage(e: PostgrestError | null, fallback = GENERIC): string {
  if (!e) return fallback
  // Solo los mensajes redactados por las funciones del flujo; los de Postgres (RLS, permisos de
  // tabla o función) revelan nombres internos (AUD RA-13).
  const native = e.message?.includes("row-level security") || e.message?.startsWith("permission denied")
  if (["42501", "22023", "P0002"].includes(e.code) && e.message && !native) return e.message
  if (e.code === "23505") return "Ya existe un registro con ese código o nombre."
  if (e.code === "23503") return "No se puede completar: hay registros que dependen de este."
  if (e.code === "23514") return "Revisa los datos: hay un valor que no está permitido."
  if (e.code === "42501") return "No tienes permiso para esta acción."
  return fallback
}

/** Envuelve una acción: errores inesperados → mensaje genérico (el detalle queda en el log del servidor). */
async function guard<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message)
    // redirect() y notFound() se propagan.
    if (e && typeof e === "object" && "digest" in e) throw e
    console.error(e)
    return fail(GENERIC)
  }
}

/** Envía los correos encolados cuando la respuesta ya salió. */
function sendMailLater() {
  after(() => flushOutbox().catch((e) => console.error("outbox", e)))
}

const refresh = () => revalidatePath("/app", "layout")

// ---------- Acceso ----------

/**
 * El CAPTCHA va primero: un intento sin resolverlo no cuenta en ningún límite (AUD RA-01).
 * El límite estricto es por correo e IP; el global por correo es más alto: bloquear la cuenta de
 * otra persona exige muchas IP y muchos CAPTCHA resueltos.
 */
export async function login(email: string, password: string, captchaToken: string): Promise<Result> {
  const normalized = email.trim().toLowerCase().slice(0, 254)
  const ip = await clientIp()
  if (!(await verifyTurnstile(captchaToken, "login", ip))) return fail(CAPTCHA_FAILED)
  const pair = `${normalized}|${ipKey(ip) ?? "desconocido"}`
  const limits = await withinLimits([["login:ip", ip], ["login:correo_ip", pair], ["login:correo", normalized]])
  if (!limits) return fail(TOO_MANY)
  const supabase = await createAuthClient(ip)
  const { error } = await supabase.auth.signInWithPassword({ email: normalized, password })
  return error ? fail("Correo o contraseña incorrectos.") : ok(undefined)
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/** Respuesta siempre genérica: no revela si el correo existe. */
export async function requestPasswordReset(email: string, captchaToken: string): Promise<Result> {
  const normalized = email.trim().toLowerCase().slice(0, 254)
  const ip = await clientIp()
  if (!(await verifyTurnstile(captchaToken, "recuperar", ip))) return fail(CAPTCHA_FAILED)
  // Al superar el límite no se envía nada, pero la respuesta sigue siendo la misma.
  if (!(await withinLimits([["recuperar:ip", ip], ["recuperar:correo", normalized]]))) return ok(undefined)
  // Tiempo de respuesta mínimo: Auth tarda más cuando el correo existe (envía el mensaje), y la
  // diferencia revelaría qué correos tienen cuenta (AUD RA-07). No va en after(): el verificador
  // PKCE se guarda en una cookie de esta respuesta.
  const started = Date.now()
  const supabase = await createAuthClient(ip)
  await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: `${APP_URL()}/auth/confirmar`,
  })
  const wait = RESET_MIN_MS - (Date.now() - started)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  return ok(undefined)
}

const RESET_MIN_MS = 2500
/** Vida de la sesión de recuperación para fijar la contraseña. */
const RECOVERY_MAX_AGE_S = 15 * 60
const RECOVERY_EXPIRED = "El enlace venció o ya fue usado. Solicita uno nuevo."

/**
 * Nueva contraseña solo con la sesión que crea el enlace de recuperación (/auth/confirmar) y
 * mientras sea reciente: una sesión robada no sirve para cambiar la contraseña y expulsar al
 * dueño de la cuenta (AUD RA-02). `amr` sale del JWT verificado.
 */
export async function updatePassword(password: string): Promise<Result> {
  if (password.length < 10) return fail("La contraseña debe tener al menos 10 caracteres.")
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  const amr = (auth?.claims?.amr ?? []) as { method?: string; timestamp?: number }[]
  const recovery = amr.find((a) => a.method === "recovery" || a.method === "otp")
  if (!recovery?.timestamp || Date.now() / 1000 - recovery.timestamp > RECOVERY_MAX_AGE_S) return fail(RECOVERY_EXPIRED)
  if (!(await withinLimits([["contrasena:usuario", auth?.claims?.sub]], { failClosed: true }))) return fail(TOO_MANY)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return fail(
      error.code === "same_password"
        ? "Usa una contraseña distinta a la anterior."
        : error.code === "weak_password"
          ? "Esa contraseña es débil o apareció en una filtración de datos. Usa otra más larga y difícil de adivinar."
          : RECOVERY_EXPIRED
    )
  }
  // Aviso de seguridad al titular: su contraseña cambió (detección de secuestro). No debe romper
  // el cambio ya exitoso si el encolado/envío falla.
  const email = auth?.claims?.email
  if (typeof email === "string" && email) {
    try {
      const cuando = new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(new Date())
      await createAdminClient().from("email_outbox").insert({ to_email: email, template: "contrasena_cambiada", payload: { cuando } })
      after(() => flushOutbox().catch((e) => console.error("outbox", e)))
    } catch (e) {
      console.error("aviso contraseña cambiada", e)
    }
  }
  return ok(undefined)
}

const INVITATION_GONE = "Esta invitación venció o ya fue usada."
const isInvitationToken = (token: string) => /^[A-Za-z0-9_-]{20,100}$/.test(token)

/** Límite de intentos por IP y por token para las dos formas de aceptar una invitación. */
async function invitationAttemptAllowed(token: string, ip: string | null) {
  return withinLimits([["invitacion:ip", ip], ["invitacion:token", token]])
}

/**
 * Crea la cuenta desde una invitación (el correo aún no tiene cuenta). El token solo viaja
 * por correo y la base guarda su hash: tenerlo prueba el control del buzón, por eso la cuenta
 * se crea confirmada. Si el correo ya tiene cuenta, se acepta con sesión (joinOrganization).
 */
export async function acceptInvitation(
  token: string,
  input: { fullName: string; password: string; acceptsDataPolicy: boolean; captchaToken: string }
): Promise<Result> {
  return guard(async () => {
    if (!input.acceptsDataPolicy) return fail("Debes aceptar la política de tratamiento de datos.")
    if (input.password.length < 10) return fail("La contraseña debe tener al menos 10 caracteres.")
    const fullName = input.fullName.trim().slice(0, 200)
    if (fullName.length < 3) return fail("Escribe tu nombre completo.")
    if (!isInvitationToken(token)) return fail(INVITATION_GONE)
    const ip = await clientIp()
    if (!(await invitationAttemptAllowed(token, ip))) return fail(TOO_MANY)
    if (!(await verifyTurnstile(input.captchaToken, "invitacion", ip))) return fail(CAPTCHA_FAILED)

    const admin = createAdminClient()
    const tokenHash = sha256Hex(token)
    const { data: inv } = await admin.from("invitations").select("email, accepted_at, expires_at").eq("token_hash", tokenHash).maybeSingle()
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) return fail(INVITATION_GONE)
    const { data: existing } = await admin.from("profiles").select("id").eq("email", inv.email).maybeSingle()
    if (existing) return fail("Ya tienes una cuenta con este correo. Ingresa con ella para unirte.")

    const { data, error } = await admin.auth.admin.createUser({
      email: inv.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) {
      return fail(error?.code === "weak_password" ? "Esa contraseña es débil o apareció en una filtración de datos. Usa otra más larga y difícil de adivinar." : GENERIC)
    }
    // Un solo uso y correo verificado en la base; si falla (p. ej. uso concurrente), la cuenta se descarta.
    const { error: aErr } = await admin.rpc("accept_invitation", { p_token_hash: tokenHash, p_user: data.user.id, p_full_name: fullName })
    if (aErr) {
      await admin.auth.admin.deleteUser(data.user.id)
      return fail(dbMessage(aErr, INVITATION_GONE))
    }

    const supabase = await createAuthClient(ip)
    const { error: sErr } = await supabase.auth.signInWithPassword({ email: inv.email, password: input.password })
    return sErr ? fail("Tu cuenta quedó lista. Ingresa con tu correo y contraseña.") : ok(undefined)
  })
}

/** Une a la organización invitada la cuenta con sesión iniciada (debe ser la del correo invitado). */
export async function joinOrganization(token: string, input: { acceptsDataPolicy: boolean }): Promise<Result> {
  return guard(async () => {
    if (!input.acceptsDataPolicy) return fail("Debes aceptar la política de tratamiento de datos.")
    if (!isInvitationToken(token)) return fail(INVITATION_GONE)
    const { data: auth } = await (await createClient()).auth.getUser()
    if (!auth.user) return fail("Tu sesión terminó. Ingresa de nuevo para unirte.")
    if (!(await invitationAttemptAllowed(token, await clientIp()))) return fail(TOO_MANY)
    const { error } = await createAdminClient().rpc("accept_invitation", { p_token_hash: sha256Hex(token), p_user: auth.user.id })
    if (error) return fail(dbMessage(error, INVITATION_GONE))
    refresh()
    return ok(undefined)
  })
}

// ---------- Segundo factor (Superadmin, AUD-20260924 ALTA-04) ----------

export interface MfaEnrollment {
  factorId: string
  /** SVG del código QR como data URI. */
  qrCode: string
  secret: string
}

/** Registra la app de autenticación (TOTP) de la cuenta Superadmin; descarta intentos sin verificar. */
export async function startMfaEnrollment(): Promise<Result<MfaEnrollment>> {
  return guard(async () => {
    const supabase = await createClient()
    const { data: isAccount } = await supabase.rpc("is_platform_admin_account")
    if (!isAccount) return fail("No tienes permiso para esta acción.")
    const { data: factors } = await supabase.auth.mfa.listFactors()
    if (factors?.totp.length) return fail("Tu cuenta ya tiene una app de autenticación. Escribe el código que muestra.")
    for (const f of factors?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CrubolDocs" })
    if (error || !data) return fail(GENERIC)
    return ok({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
  })
}

/** Verifica el código de la app de autenticación: la sesión pasa a aal2. */
export async function verifyMfa(factorId: string, code: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(factorId) || !/^\d{6}$/.test(code)) return fail("Escribe el código de 6 dígitos de tu app de autenticación.")
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getClaims()
    const uid = auth?.claims?.sub
    if (!uid) return fail("Tu sesión terminó. Ingresa de nuevo.")
    if (!(await withinLimits([["mfa:usuario", uid]], { failClosed: true }))) return fail(TOO_MANY)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) return fail("El código no es correcto o ya cambió. Escribe el código que muestra ahora tu app.")
    return ok(undefined)
  })
}

/** Cambia la organización activa (usuarios con varias membresías). */
export async function setActiveOrganization(orgId: string): Promise<Result> {
  if (!isUuid(orgId)) return fail("Organización no válida.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_active_org", { org: orgId })
  if (error) return fail(dbMessage(error))
  refresh()
  return ok(undefined)
}

// ---------- Búsqueda y exportaciones ----------

// Los filtros llegan del navegador: forma y longitud acotadas antes de consultar (AUD BAJ-07).
const filterText = z.string().max(200).optional()
const sortDir = z.enum(["asc", "desc"]).optional()
const documentFiltersSchema = z.object({
  q: filterText,
  processId: filterText,
  typeId: filterText,
  statuses: z.array(z.enum(Object.keys(DOCUMENT_STATUS_META) as [DocumentStatus, ...DocumentStatus[]])).max(20).optional(),
  reviewOverdue: z.boolean().optional(),
  sort: z.enum(["code", "title", "nextReview"]).optional(),
  dir: sortDir,
  page: z.number().int().min(1).max(100_000).optional(),
})
const riskFiltersSchema = z.object({
  q: filterText,
  processId: filterText,
  category: filterText,
  level: z.enum(Object.keys(RISK_LEVEL_LABELS) as [RiskLevel, ...RiskLevel[]]).optional(),
  overdueControls: z.boolean().optional(),
  kind: z.enum(["inherente", "residual"]).optional(),
  cell: z.string().regex(/^[1-5]-[1-5]$/).optional(),
  sort: z.enum(["level", "code", "process"]).optional(),
  dir: sortDir,
})
const auditFiltersSchema = z.object({
  from: filterText,
  to: filterText,
  actor: filterText,
  action: filterText,
  entityType: filterText,
})

export async function searchDocumentsAction(q: string): Promise<DocumentSummary[]> {
  const parsed = z.string().max(200).safeParse(q)
  return parsed.success ? searchDocuments(parsed.data) : []
}

export async function exportDocumentsCsv(input: DocumentFilters): Promise<string> {
  const filters = documentFiltersSchema.parse(input)
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

export async function exportRisksCsv(input: RiskFilters): Promise<string> {
  const filters = riskFiltersSchema.parse(input)
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

export async function exportAuditCsv(input: AuditFilters): Promise<string> {
  const filters = auditFiltersSchema.parse(input)
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

export interface VersionUploads {
  documentId: string
  versionNo: number
  pdf: UploadTicket
  source: UploadTicket
}

const registerSchema = z.object({
  processId: z.uuid(),
  typeId: z.uuid(),
  title: z.string().trim().min(3).max(200),
  code: z.string().trim().min(3).max(40),
  elaboradorPositionId: z.uuid(),
  revisorPositionId: z.uuid(),
  aprobadorPositionId: z.uuid(),
  distributionPositionIds: z.array(z.uuid()).max(500),
  readRequired: z.boolean(),
  reviewEveryMonths: z.number().int().min(1).max(60),
  changeSummary: z.string().max(1000),
  pdfFileName: z.string().min(1).max(255),
  sourceFileName: z.string().min(1).max(255),
})

/** Rutas y URLs de subida firmadas para los archivos de una versión. */
async function versionTickets(org: string, documentId: string, versionId: string, versionNo: number, pdfName: string, sourceName: string): Promise<VersionUploads> {
  const base = `${org}/${documentId}/${versionId}`
  const stamp = Date.now().toString(36)
  const [pdf, source] = await Promise.all([
    createUploadTicket("documentos", stagingPath(base, `${stamp}-${safeFileName(pdfName)}`)),
    createUploadTicket("documentos", stagingPath(base, `${stamp}-${safeFileName(sourceName)}`)),
  ])
  return { documentId, versionNo, pdf, source }
}

function fileNamesError(pdfName: string, sourceName: string): string | null {
  if (!isPdfName(pdfName)) return "El archivo publicado debe ser un PDF."
  if (!isSourceName(sourceName)) return "El archivo fuente debe ser Word, Excel o PowerPoint."
  return null
}

/**
 * Paso 1 del registro: crea el documento con su versión 1 en borrador y devuelve las
 * URLs de subida. El cliente sube los archivos y llama a `attachVersionFiles`.
 */
export async function registerDocument(
  input: RegisterDocumentInput
): Promise<Result<{ id: string; code: string; uploads: VersionUploads }>> {
  return guard(async () => {
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) return fail("Revisa los datos del formulario.")
    const v = parsed.data
    const seg = segregationError(v.elaboradorPositionId, v.revisorPositionId, v.aprobadorPositionId)
    if (seg) return fail(seg)
    const names = fileNamesError(v.pdfFileName, v.sourceFileName)
    if (names) return fail(names)

    const user = await getCurrentUser()
    const supabase = await createClient()
    const id = randomUUID()
    const code = v.code.toUpperCase()
    const { data: versionId, error } = await supabase.rpc("create_document", {
      p_id: id,
      p_org: user.organization.id,
      p_process: v.processId,
      p_type: v.typeId,
      p_code: code,
      p_title: v.title,
      p_elaborador: v.elaboradorPositionId,
      p_revisor: v.revisorPositionId,
      p_aprobador: v.aprobadorPositionId,
      p_distribution: [...new Set(v.distributionPositionIds)],
      p_read_required: v.readRequired,
      p_review_months: v.reviewEveryMonths,
      p_change_summary: v.changeSummary.trim(),
    })
    if (error) {
      return fail(error.code === "23505" ? `El código ${code} ya existe. Usa otro consecutivo.` : dbMessage(error))
    }
    refresh()
    return ok({ id, code, uploads: await versionTickets(user.organization.id, id, versionId, 1, v.pdfFileName, v.sourceFileName) })
  })
}

/** Versión en borrador que el usuario puede editar (cargo elaborador o quien la registró). */
async function editableDraft(documentId: string, versionNo: number) {
  if (!isUuid(documentId)) return null
  const user = await getCurrentUser()
  const supabase = await createClient()
  const [{ data: doc }, { data: version }] = await Promise.all([
    supabase.from("documents").select("organization_id, elaborador_position_id").eq("id", documentId).maybeSingle(),
    supabase.from("document_versions").select("*").eq("document_id", documentId).eq("version_no", versionNo).maybeSingle(),
  ])
  if (!doc || !version || version.status !== "borrador") return null
  if (doc.elaborador_position_id !== user.positionId && version.elaborated_by !== user.id) return null
  return { user, supabase, doc, version }
}

/** URLs de subida para reemplazar los archivos de un borrador. */
export async function prepareVersionUpload(
  documentId: string,
  versionNo: number,
  pdfFileName: string,
  sourceFileName: string
): Promise<Result<VersionUploads>> {
  return guard(async () => {
    const names = fileNamesError(pdfFileName, sourceFileName)
    if (names) return fail(names)
    const draft = await editableDraft(documentId, versionNo)
    if (!draft) return fail("Solo el elaborador puede reemplazar los archivos de una versión en borrador.")
    return ok(await versionTickets(draft.doc.organization_id, documentId, draft.version.id, versionNo, pdfFileName, sourceFileName))
  })
}

/**
 * Paso 2: verifica los archivos subidos (tamaño, tipo, SHA-256), los asocia a la versión
 * y, si se pide, la envía a revisión. Borra los archivos anteriores reemplazados.
 */
export async function attachVersionFiles(input: {
  documentId: string
  versionNo: number
  pdfPath: string
  sourcePath: string
  sourceFileName: string
  submit: boolean
}): Promise<Result<{ sourceFileName: string }>> {
  return guard(async () => {
    const draft = await editableDraft(input.documentId, input.versionNo)
    if (!draft) return fail("Solo el elaborador puede adjuntar archivos a una versión en borrador.")
    const base = `${draft.doc.organization_id}/${input.documentId}/${draft.version.id}`
    if (input.pdfPath === input.sourcePath) return fail("Ruta de archivo inválida.")
    const [pdf, source] = await Promise.all([
      promoteUpload("documentos", base, input.pdfPath, (ext) => ext === "pdf"),
      promoteUpload("documentos", base, input.sourcePath, (ext) => SOURCE_EXT.includes(ext)),
    ])
    const sourceFileName = downloadName(String(input.sourceFileName ?? ""), source.path)
    // Solo el servidor asocia archivos (la RPC no es ejecutable por `authenticated`).
    const { error } = await createAdminClient().rpc("set_version_files", {
      p_actor: draft.user.id,
      p_version: draft.version.id,
      p_pdf_path: pdf.path,
      p_pdf_sha256: pdf.sha256,
      p_pdf_size: pdf.size,
      p_source_path: source.path,
      p_source_sha256: source.sha256,
      p_source_name: sourceFileName,
      p_source_size: source.size,
    })
    if (error) {
      await removeObjects("documentos", [pdf.path, source.path])
      return fail(dbMessage(error))
    }
    const stale = [draft.version.pdf_path, draft.version.source_path].filter(
      (p): p is string => !!p && p !== pdf.path && p !== source.path
    )
    await removeObjects("documentos", stale)

    if (input.submit) {
      const { error: sErr } = await draft.supabase.rpc("submit_version", { p_version: draft.version.id })
      if (sErr) return fail(dbMessage(sErr))
      sendMailLater()
    }
    refresh()
    return ok({ sourceFileName })
  })
}

/** Id de la versión N del documento (visible para el usuario según RLS). */
async function versionId(documentId: string, versionNo: number): Promise<string | null> {
  if (!isUuid(documentId)) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("document_versions")
    .select("id")
    .eq("document_id", documentId)
    .eq("version_no", versionNo)
    .maybeSingle()
  return data?.id ?? null
}

/** Ejecuta una función del flujo sobre la versión N y envía los correos que haya generado. */
async function flowOnVersion(
  documentId: string,
  versionNo: number,
  call: (id: string) => PromiseLike<{ error: PostgrestError | null }>
): Promise<Result> {
  return guard(async () => {
    const id = await versionId(documentId, versionNo)
    if (!id) return fail("No encontramos esta versión del documento.")
    const { error } = await call(id)
    if (error) return fail(dbMessage(error))
    sendMailLater()
    refresh()
    return ok(undefined)
  })
}

export async function submitForReview(documentId: string, versionNo: number): Promise<Result> {
  const supabase = await createClient()
  return flowOnVersion(documentId, versionNo, (id) => supabase.rpc("submit_version", { p_version: id }))
}

/** Firma con reautenticación: la contraseña se verifica contra Auth antes de registrar (ADR-004). */
export async function signVersion(input: {
  documentId: string
  versionNo: number
  action: "revision" | "aprobacion"
  password: string
}): Promise<Result<{ signedAt: string }>> {
  return guard(async () => {
    if (!input.password) return fail("Escribe tu contraseña para firmar.")
    if (input.action !== "revision" && input.action !== "aprobacion") return fail("Acción de firma inválida.")
    const user = await getCurrentUser()
    if (!isUuid(input.documentId)) return fail("No encontramos esta versión del documento.")
    const { data: version } = await (await createClient())
      .from("document_versions")
      .select("id, pdf_path, pdf_sha256")
      .eq("document_id", input.documentId)
      .eq("version_no", input.versionNo)
      .maybeSingle()
    if (!version) return fail("No encontramos esta versión del documento.")
    const id = version.id

    if (!(await withinLimits([["firma:usuario", user.id]], { failClosed: true }))) return fail(TOO_MANY)
    const ip = await clientIp()
    const ephemeral = createEphemeralClient(ip)
    const { data: reauth, error: authErr } = await ephemeral.auth.signInWithPassword({ email: user.email, password: input.password })
    if (authErr || reauth.user?.id !== user.id) return fail("La contraseña no es correcta. La firma no se registró.")
    await ephemeral.auth.signOut({ scope: "local" })

    // Lo que se firma es el hash registrado: el PDF guardado debe seguir correspondiendo (ADR-004).
    if (!version.pdf_path || !version.pdf_sha256 || !(await storedFileMatches("documentos", version.pdf_path, version.pdf_sha256))) {
      console.error("firma: el PDF guardado no coincide con el hash registrado", { version: id })
      return fail("El PDF guardado no coincide con el registrado. La firma no se registró; avisa al Líder SIG.")
    }

    const h = await headers()
    // La base bloquea la versión y firma solo si su PDF sigue siendo el verificado (AUD RA-10).
    const { error } = await createAdminClient().rpc("sign_version_checked", {
      p_version: id,
      p_expected_sha256: version.pdf_sha256,
      p_signer: user.id,
      p_action: input.action,
      p_meaning: SIGNATURE_MEANING[input.action],
      p_ip: ip ?? undefined,
      p_user_agent: (h.get("user-agent") ?? "").slice(0, 400),
    })
    if (error) return fail(dbMessage(error))
    sendMailLater()
    refresh()
    return ok({ signedAt: new Date().toISOString() })
  })
}

export async function returnVersion(documentId: string, versionNo: number, reason: string): Promise<Result> {
  if (reason.trim().length < 10) return fail("Explica el motivo en al menos 10 caracteres.")
  const supabase = await createClient()
  return flowOnVersion(documentId, versionNo, (id) =>
    supabase.rpc("return_version", { p_version: id, p_reason: reason.trim().slice(0, 4000) })
  )
}

export async function confirmRead(documentId: string, versionNo: number): Promise<Result<{ at: string }>> {
  const supabase = await createClient()
  const res = await flowOnVersion(documentId, versionNo, (id) => supabase.rpc("confirm_read", { p_version: id }))
  return res.ok ? ok({ at: new Date().toISOString() }) : res
}

export async function requestUpdate(documentId: string, reason: string): Promise<Result> {
  return guard(async () => {
    if (reason.trim().length < 10) return fail("Explica el motivo en al menos 10 caracteres.")
    if (!isUuid(documentId)) return fail("Documento no válido.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("request_update", { p_doc: documentId, p_reason: reason.trim().slice(0, 2000) })
    if (error) return fail(dbMessage(error))
    sendMailLater()
    refresh()
    return ok(undefined)
  })
}

export async function resolveChangeRequest(requestId: string, accept: boolean, resolution: string): Promise<Result> {
  return guard(async () => {
    if (!accept && resolution.trim().length < 10) return fail("Explica por qué se rechaza en al menos 10 caracteres.")
    if (!isUuid(requestId)) return fail("Solicitud no válida.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("resolve_change_request", {
      p_request: requestId,
      p_accept: accept,
      p_resolution: resolution.trim().slice(0, 2000),
    })
    if (error) return fail(dbMessage(error))
    refresh()
    return ok(undefined)
  })
}

export async function addComment(versionId: string, body: string): Promise<Result<{ id: string; at: string }>> {
  return guard(async () => {
    const text = body.trim()
    if (!text) return fail("Escribe el comentario antes de enviarlo.")
    if (text.length > 4000) return fail("El comentario puede tener hasta 4.000 caracteres.")
    if (!isUuid(versionId)) return fail("Versión no válida.")
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("add_comment", { p_version: versionId, p_body: text })
    if (error) return fail(dbMessage(error))
    return ok({ id: data, at: new Date().toISOString() })
  })
}

export async function resolveComment(commentId: string): Promise<Result<{ at: string }>> {
  return guard(async () => {
    if (!isUuid(commentId)) return fail("Comentario no válido.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("resolve_comment", { p_comment: commentId })
    if (error) return fail(dbMessage(error))
    return ok({ at: new Date().toISOString() })
  })
}

// ---------- Riesgos ----------

/** URL de subida para la evidencia de un control (solo el cargo responsable). */
export async function prepareEvidenceUpload(controlId: string, fileName: string): Promise<Result<UploadTicket>> {
  return guard(async () => {
    if (!isUuid(controlId)) return fail("Control no válido.")
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { data: c } = await supabase.from("controls").select("organization_id, responsible_position_id").eq("id", controlId).maybeSingle()
    if (!c || c.responsible_position_id !== user.positionId) return fail("Solo el cargo responsable registra evidencia de este control.")
    if (!isEvidenceName(fileName)) return fail("Adjunta un PDF, una imagen (PNG, JPG, WebP), un CSV o un archivo de Office.")
    return ok(await createUploadTicket("evidencias", stagingPath(`${c.organization_id}/${controlId}/${randomUUID()}`, safeFileName(fileName))))
  })
}

export async function registerEvidence(input: {
  controlId: string
  executedAt: string
  result: EvidenceResult
  notes: string
  fileName: string | null
  /** Ruta devuelta por prepareEvidenceUpload, si se adjuntó archivo. */
  filePath?: string | null
}): Promise<Result> {
  return guard(async () => {
    if (!input.executedAt || !/^\d{4}-\d{2}-\d{2}$/.test(input.executedAt)) return fail("Indica la fecha de ejecución.")
    if (input.executedAt > todayIsoDate()) return fail("La fecha de ejecución no puede ser futura.")
    if (input.result !== "efectivo" && input.result !== "no_efectivo") return fail("Elige el resultado del control.")
    if (!isUuid(input.controlId)) return fail("Control no válido.")
    const user = await getCurrentUser()
    let file: { path: string; sha256: string } | null = null
    if (input.filePath) {
      // `<org>/<control>/<uuid>/subida/<archivo>`: el uuid lo generó prepareEvidenceUpload.
      const base = input.filePath.split("/").slice(0, 3).join("/")
      const [org, control, key] = base.split("/")
      if (org !== user.organization.id || control !== input.controlId || !isUuid(key)) return fail("Ruta de archivo inválida.")
      file = await promoteUpload("evidencias", base, input.filePath, (ext) => EVIDENCE_EXT.includes(ext))
    }
    // Solo el servidor registra evidencias (la RPC no es ejecutable por `authenticated`).
    const { error } = await createAdminClient().rpc("register_evidence", {
      p_actor: user.id,
      p_control: input.controlId,
      p_executed_at: input.executedAt,
      p_result: input.result,
      p_notes: input.notes.trim().slice(0, 2000),
      p_file_path: file?.path,
      p_file_sha256: file?.sha256,
      p_file_name: file ? downloadName(String(input.fileName ?? ""), file.path) : undefined,
    })
    if (error) {
      if (file) await removeObjects("evidencias", [file.path])
      return fail(dbMessage(error))
    }
    refresh()
    return ok(undefined)
  })
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

const scale = z.number().int().min(1).max(5)
const controlSchema = z.object({
  description: z.string().trim().min(5).max(500),
  type: z.enum(["preventivo", "detectivo", "correctivo"]),
  frequency: z.enum(["diaria", "semanal", "mensual", "trimestral", "semestral", "anual", "por_evento"]),
  responsiblePositionId: z.uuid(),
})

export async function createRisk(input: CreateRiskInput): Promise<Result<{ id: string; code: string }>> {
  return guard(async () => {
    if (input.description.trim().length < 5) return fail("Describe el riesgo en al menos 5 caracteres.")
    const parsed = z
      .object({
        processId: z.uuid(),
        ownerPositionId: z.uuid(),
        category: z.string().trim().min(2).max(80),
        probability: scale,
        impact: scale,
        controls: z.array(controlSchema).max(50),
      })
      .safeParse(input)
    if (!parsed.success) return fail("Revisa los datos del riesgo y sus controles.")
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("create_risk", {
      p_org: user.organization.id,
      p_process: input.processId,
      p_description: input.description.trim(),
      p_cause: input.cause.trim().slice(0, 2000),
      p_consequence: input.consequence.trim().slice(0, 2000),
      p_category: input.category.trim(),
      p_owner: input.ownerPositionId,
      p_probability: input.probability,
      p_impact: input.impact,
      p_controls: parsed.data.controls as unknown as Json,
    })
    if (error || !data?.[0]) return fail(dbMessage(error))
    refresh()
    return ok({ id: data[0].id, code: data[0].code })
  })
}

export async function addAssessment(riskId: string, kind: "inherente" | "residual", p: number, i: number): Promise<Result> {
  return guard(async () => {
    if (!isUuid(riskId) || !scale.safeParse(p).success || !scale.safeParse(i).success) return fail("Valoración no válida.")
    if (kind !== "inherente" && kind !== "residual") return fail("Valoración no válida.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("add_assessment", { p_risk: riskId, p_kind: kind, p_probability: p, p_impact: i })
    if (error) return fail(dbMessage(error))
    refresh()
    return ok(undefined)
  })
}

export async function addControl(
  riskId: string,
  control: { description: string; type: ControlType; frequency: string; responsiblePositionId: string }
): Promise<Result> {
  return guard(async () => {
    const parsed = controlSchema.safeParse(control)
    if (!isUuid(riskId) || !parsed.success) return fail("Revisa los datos del control.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("add_control", {
      p_risk: riskId,
      p_description: parsed.data.description,
      p_type: parsed.data.type,
      p_frequency: parsed.data.frequency,
      p_responsible: parsed.data.responsiblePositionId,
    })
    if (error) return fail(dbMessage(error))
    refresh()
    return ok(undefined)
  })
}

// ---------- Administración ----------

const INVITATION_PREFIX = "inv_"

/** Resultado de invitar: el enlace se devuelve solo si no hay SMTP (se comparte a mano). */
export type InviteResult = Result<{ link: string | null }>

const invitationLink = (token: string) => `${APP_URL()}/invitacion/${token}`
/**
 * Enlace para compartir a mano: solo en desarrollo y sin SMTP. En producción el token viaja
 * únicamente por correo; si quien invita lo viera, podría activar la cuenta de otra persona.
 */
const linkIfNoMail = (token: string) =>
  process.env.NODE_ENV !== "production" && !smtpConfigured() ? invitationLink(token) : null

/** Crea la invitación en la base (permisos y traza en `create_invitation`) y encola el correo. */
async function createInvitation(
  user: CurrentUser,
  org: { id: string; name: string },
  input: { email: string; positionId: string; isExternal: boolean; validUntil: string | null; isOrgAdmin: boolean }
): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase()
  const token = newToken()
  const { data, error } = await createAdminClient().rpc("create_invitation", {
    p_actor: user.id,
    p_org: org.id,
    p_email: email,
    p_position: input.positionId,
    p_is_org_admin: input.isOrgAdmin,
    p_is_external: input.isExternal,
    // Los tipos generados no marcan parámetros nulos; la función acepta null para internos.
    p_valid_until: (input.isExternal ? input.validUntil : null) as string,
    p_token_hash: sha256Hex(token),
  })
  const inv = data?.[0]
  if (error || !inv) return fail(dbMessage(error))

  await enqueueInvitationEmail(org.id, org.name, input.positionId, email, token, inv.expires_at)
  sendMailLater()
  return ok({ link: linkIfNoMail(token) })
}

async function enqueueInvitationEmail(orgId: string, orgName: string, positionId: string, email: string, token: string, expiresAt: string) {
  const admin = createAdminClient()
  const { data: pos } = await admin.from("positions").select("name").eq("id", positionId).single()
  await admin.from("email_outbox").insert({
    organization_id: orgId,
    to_email: email,
    template: "invitacion",
    payload: { organizacion: orgName, cargo: pos?.name ?? "", enlace: invitationLink(token), vence: expiresAt },
  })
}

const inviteSchema = z.object({
  email: z.email().max(254),
  positionId: z.uuid(),
  isExternal: z.boolean(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  isOrgAdmin: z.boolean(),
})

export async function inviteUser(input: {
  email: string
  positionId: string
  isExternal: boolean
  validUntil: string | null
  isOrgAdmin: boolean
}): Promise<InviteResult> {
  return guard(async () => {
    if (input.isExternal && !input.validUntil) return fail("Indica hasta cuándo tendrá acceso el usuario externo.")
    const parsed = inviteSchema.safeParse({ ...input, email: input.email.trim().toLowerCase(), validUntil: input.validUntil || null })
    if (!parsed.success) return fail("Revisa el correo y el cargo.")
    const user = await getCurrentUser()
    const res = await createInvitation(user, user.organization, parsed.data)
    if (res.ok) refresh()
    return res
  })
}

/** Invitación visible para el usuario (RLS: solo Admin/Líder SIG de esa organización). */
async function managedInvitation(memberId: string) {
  const id = memberId.slice(INVITATION_PREFIX.length)
  if (!memberId.startsWith(INVITATION_PREFIX) || !isUuid(id)) return null
  const supabase = await createClient()
  const { data } = await supabase.from("invitations").select("*").eq("id", id).is("accepted_at", null).maybeSingle()
  return data
}

export async function resendInvitation(membershipId: string): Promise<InviteResult> {
  return guard(async () => {
    const inv = await managedInvitation(membershipId)
    if (!inv) return fail("Solo se reenvían invitaciones pendientes.")
    const user = await getCurrentUser()
    const token = newToken()
    // Nuevo token y descarte de los correos pendientes con el anterior (solo de esta organización).
    const { data: expires, error } = await createAdminClient().rpc("reissue_invitation", {
      p_actor: user.id,
      p_invitation: inv.id,
      p_token_hash: sha256Hex(token),
    })
    if (error || !expires) return fail(dbMessage(error))
    await enqueueInvitationEmail(inv.organization_id, user.organization.name, inv.position_id, inv.email, token, expires)
    sendMailLater()
    return ok({ link: linkIfNoMail(token) })
  })
}

export async function revokeAccess(membershipId: string): Promise<Result> {
  return guard(async () => {
    const user = await getCurrentUser()
    const supabase = await createClient()
    const inv = await managedInvitation(membershipId)
    if (inv) {
      const { data, error } = await supabase.from("invitations").delete().eq("id", inv.id).select("id")
      if (error || !data?.length) return fail(error ? dbMessage(error) : "No tienes permiso para esta acción.")
      refresh()
      return ok(undefined)
    }
    if (!isUuid(membershipId)) return fail("Membresía no válida.")
    const { data: m } = await supabase.from("memberships").select("user_id").eq("id", membershipId).maybeSingle()
    if (!m) return fail("No encontramos este acceso.")
    if (m.user_id === user.id) return fail("No puedes revocar tu propio acceso.")
    const { data, error } = await supabase.from("memberships").update({ status: "revocado" }).eq("id", membershipId).select("id")
    if (error || !data?.length) return fail(error ? dbMessage(error) : "No tienes permiso para esta acción.")
    refresh()
    return ok(undefined)
  })
}

export async function updateMembership(
  membershipId: string,
  changes: { positionId?: string; validUntil?: string | null }
): Promise<Result> {
  return guard(async () => {
    if (changes.positionId !== undefined && !isUuid(changes.positionId)) return fail("Elige un cargo válido.")
    if (changes.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(changes.validUntil)) return fail("Fecha no válida.")
    const patch = {
      ...(changes.positionId !== undefined && { position_id: changes.positionId }),
      ...(changes.validUntil !== undefined && { valid_until: changes.validUntil || null }),
    }
    const supabase = await createClient()
    const inv = await managedInvitation(membershipId)
    if (!inv && !isUuid(membershipId)) return fail("Membresía no válida.")
    const { data, error } = inv
      ? await supabase.from("invitations").update(patch).eq("id", inv.id).select("id")
      : await supabase.from("memberships").update(patch).eq("id", membershipId).select("id")
    if (error) return fail(error.code === "23514" ? "Un usuario externo debe tener fecha de fin de acceso." : dbMessage(error))
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    refresh()
    return ok(undefined)
  })
}

const recertSchema = z.array(z.object({ membershipId: z.uuid(), keep: z.boolean() })).min(1).max(1000)

export async function saveRecertDecisions(input: { membershipId: string; keep: boolean }[]): Promise<Result<{ count: number }>> {
  return guard(async () => {
    const parsed = recertSchema.safeParse(input)
    if (!parsed.success) return fail("Marca al menos un acceso que no sea el tuyo.")
    const decisions = parsed.data
    const user = await getCurrentUser()
    const supabase = await createClient()
    const ids = decisions.map((d) => d.membershipId).filter(isUuid)
    // Nadie recertifica su propio acceso (también lo impide la base).
    const { data: own } = await supabase.from("memberships").select("id").in("id", ids).eq("user_id", user.id)
    const valid = decisions.filter((d) => isUuid(d.membershipId) && !own?.some((o) => o.id === d.membershipId))
    if (!valid.length) return fail("Marca al menos un acceso que no sea el tuyo.")
    const { error } = await supabase.from("access_recertifications").insert(
      valid.map((d) => ({
        organization_id: user.organization.id,
        membership_id: d.membershipId,
        reviewed_by: user.id,
        decision: d.keep ? "mantener" : "revocar",
      }))
    )
    // La base aplica cada decisión en la membresía (fecha o revocación) en la misma operación.
    if (error) return fail(dbMessage(error))
    await createAdminClient().rpc("complete_tasks", {
      p_type: "recertificar_accesos",
      p_entity_id: user.organization.id,
      p_actor: user.id,
    })
    refresh()
    return ok({ count: valid.length })
  })
}

export async function saveProcess(input: { id?: string; code: string; name: string; type: string; leaderPositionId: string | null }): Promise<Result> {
  return guard(async () => {
    const code = input.code.trim().toUpperCase()
    const name = input.name.trim()
    if (!code || !name) return fail("Completa el código y el nombre del proceso.")
    if (!/^[A-Z0-9]{2,6}$/.test(code)) return fail("El código debe tener de 2 a 6 letras o números (p. ej. GC).")
    if (!["estrategico", "misional", "apoyo", "evaluacion"].includes(input.type)) return fail("Elige el tipo de proceso.")
    const leader = input.leaderPositionId && isUuid(input.leaderPositionId) ? input.leaderPositionId : null
    const user = await getCurrentUser()
    const supabase = await createClient()
    const row = { code, name, type: input.type, leader_position_id: leader }
    const { data, error } = input.id
      ? await supabase.from("processes").update(row).eq("id", input.id).select("id")
      : await supabase.from("processes").insert({ ...row, organization_id: user.organization.id }).select("id")
    if (error) return fail(error.code === "23505" ? `Ya existe un proceso con el código ${code}.` : dbMessage(error))
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    refresh()
    return ok(undefined)
  })
}

export async function deleteProcess(processId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(processId)) return fail("Proceso no válido.")
    const supabase = await createClient()
    const { data, error } = await supabase.from("processes").delete().eq("id", processId).select("id")
    if (error) {
      return fail(
        error.code === "23503"
          ? "No puedes eliminar un proceso que tiene documentos, riesgos o cargos asociados. Reasígnalos primero."
          : dbMessage(error)
      )
    }
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    refresh()
    return ok(undefined)
  })
}

export async function saveDocumentType(input: { id?: string; code: string; name: string }): Promise<Result> {
  return guard(async () => {
    if (!/^[A-Z]{2,3}$/.test(input.code)) return fail("El código debe tener 2 o 3 letras mayúsculas (p. ej. PR).")
    const name = input.name.trim()
    if (name.length < 2) return fail("Escribe el nombre del tipo.")
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { data, error } = input.id
      ? await supabase.from("document_types").update({ code: input.code, name }).eq("id", input.id).select("id")
      : await supabase.from("document_types").insert({ code: input.code, name, organization_id: user.organization.id }).select("id")
    if (error) return fail(error.code === "23505" ? `Ya existe un tipo con el código ${input.code}.` : dbMessage(error))
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    refresh()
    return ok(undefined)
  })
}

const ROLES = ["lider_sig", "lider_proceso", "elaborador", "revisor", "aprobador", "responsable_control", "auditor", "consulta"] as const

export async function savePosition(input: {
  id?: string
  name: string
  processId: string | null
  roles: { role: string; processId: string | null }[]
}): Promise<Result> {
  return guard(async () => {
    const name = input.name.trim()
    if (!name) return fail("Escribe el nombre del cargo.")
    const roles = z
      .array(z.object({ role: z.enum(ROLES), processId: z.uuid().nullable() }))
      .max(50)
      .safeParse(input.roles)
    if (!roles.success) return fail("Revisa los roles del cargo.")
    const user = await getCurrentUser()
    const org = user.organization.id
    const supabase = await createClient()
    const processId = input.processId && isUuid(input.processId) ? input.processId : null
    const { data, error } = input.id
      ? await supabase.from("positions").update({ name, process_id: processId }).eq("id", input.id).select("id")
      : await supabase.from("positions").insert({ name, process_id: processId, organization_id: org }).select("id")
    if (error) return fail(error.code === "23505" ? `Ya existe un cargo llamado ${name}.` : dbMessage(error))
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    const positionId = data[0].id

    // Solo se tocan los roles que cambian: así se puede renombrar el cargo propio, cuyos roles
    // la base no deja cambiar.
    const key = (r: { role: string; processId: string | null }) => `${r.role}|${r.processId ?? ""}`
    const wanted = new Map(roles.data.map((r) => [key(r), r]))
    const { data: current, error: cErr } = await supabase.from("position_roles").select("id, role, process_id").eq("position_id", positionId)
    if (cErr) return fail(dbMessage(cErr))
    const have = new Map((current ?? []).map((r) => [key({ role: r.role, processId: r.process_id }), r.id]))
    const removed = [...have].filter(([k]) => !wanted.has(k)).map(([, id]) => id)
    const added = [...wanted].filter(([k]) => !have.has(k)).map(([, r]) => r)
    if (removed.length) {
      const { error: dErr } = await supabase.from("position_roles").delete().in("id", removed)
      if (dErr) return fail(dbMessage(dErr))
    }
    if (added.length) {
      const { error: iErr } = await supabase
        .from("position_roles")
        .insert(added.map((r) => ({ organization_id: org, position_id: positionId, role: r.role, process_id: r.processId })))
      if (iErr) return fail(dbMessage(iErr))
    }
    refresh()
    return ok(undefined)
  })
}

/** Superadmin: crea la organización con un cargo "Administrador" e invita a su administrador. */
export async function createOrganization(input: { name: string; nit: string; adminEmail: string }): Promise<InviteResult> {
  return guard(async () => {
    const nit = input.nit.trim()
    const name = input.name.trim()
    if (!/^\d{9}-\d$/.test(nit)) return fail("El NIT debe tener 9 dígitos y su dígito de verificación (900123456-7).")
    if (name.length < 2) return fail("Escribe el nombre de la organización.")
    const email = z.email().safeParse(input.adminEmail.trim().toLowerCase())
    if (!email.success) return fail("Escribe un correo válido para el administrador.")
    const user = await getCurrentUser()
    if (!(await platformAdminWithMfa())) return fail("No tienes permiso para esta acción.")

    const token = newToken()
    const { data, error } = await createAdminClient().rpc("create_organization", {
      p_actor: user.id,
      p_name: name,
      p_nit: nit,
      p_admin_email: email.data,
      p_token_hash: sha256Hex(token),
    })
    const created = data?.[0]
    if (error || !created) return fail(error?.code === "23505" ? "Ya existe una organización con ese NIT." : dbMessage(error))
    await enqueueInvitationEmail(created.organization_id, name, created.position_id, email.data, token, created.expires_at)
    sendMailLater()
    refresh()
    return ok({ link: linkIfNoMail(token) })
  })
}

/**
 * Superadmin con sesión de segundo factor, verificado por la base con el JWT del usuario
 * (las RPC de servidor reciben el actor y no ven el nivel de la sesión).
 */
async function platformAdminWithMfa(): Promise<boolean> {
  const { data } = await (await createClient()).rpc("is_platform_admin")
  return data === true
}

/** Superadmin: reenvía la invitación del administrador inicial (organización sin administrador activo). */
export async function resendAdminInvitation(invitationId: string): Promise<InviteResult> {
  return guard(async () => {
    if (!isUuid(invitationId)) return fail("Invitación no válida.")
    const user = await getCurrentUser()
    if (!(await platformAdminWithMfa())) return fail("No tienes permiso para esta acción.")
    const token = newToken()
    const admin = createAdminClient()
    const { data: expires, error } = await admin.rpc("reissue_invitation", {
      p_actor: user.id,
      p_invitation: invitationId,
      p_token_hash: sha256Hex(token),
    })
    if (error || !expires) return fail(dbMessage(error))
    const { data: inv } = await admin.from("invitations").select("organization_id, position_id, email").eq("id", invitationId).single()
    const { data: org } = inv ? await admin.from("organizations").select("name").eq("id", inv.organization_id).single() : { data: null }
    if (!inv || !org) return fail(GENERIC)
    await enqueueInvitationEmail(inv.organization_id, org.name, inv.position_id, inv.email, token, expires)
    sendMailLater()
    refresh()
    return ok({ link: linkIfNoMail(token) })
  })
}

// ---------- No Conformidades / CAPA ----------

const NC_SEVERITY = ["observacion", "menor", "mayor"] as const
const NC_SOURCE = ["auditoria_interna", "auditoria_externa", "queja_pqrs", "producto_servicio", "riesgo_materializado", "mejora", "otro"] as const
const NC_ACTION_TYPE = ["correccion", "correctiva", "preventiva"] as const
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function revalidateNc() {
  revalidatePath("/app/no-conformidades", "layout")
  revalidatePath("/app")
}

const reportNcSchema = z.object({
  description: z.string().trim().min(5).max(2000),
  source: z.enum(NC_SOURCE),
  processId: z.uuid().nullish(),
  severity: z.enum(NC_SEVERITY),
  detectedAt: isoDate.optional(),
  sourceRiskId: z.uuid().nullish(),
})

/** Reporta una no conformidad (cualquier miembro). El título se deriva de la descripción. */
export async function reportNonconformity(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = reportNcSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del reporte.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("report_nonconformity", {
      p_org: user.organization.id,
      p_source: p.data.source,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_title: p.data.description.slice(0, 120),
      p_description: p.data.description,
      p_severity: p.data.severity,
      p_detected_at: p.data.detectedAt,
      p_source_risk: p.data.sourceRiskId ?? undefined,
    })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    after(() => deliverChat().catch((e) => console.error("chat", e)))
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function setNcCause(ncId: string, cause: string, ownerPositionId?: string | null): Promise<Result> {
  return guard(async () => {
    if (!isUuid(ncId) || cause.trim().length < 5) return fail("Describe la causa raíz.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("set_nc_cause", { p_nc: ncId, p_cause: cause, p_owner: ownerPositionId ?? undefined })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

const addActionSchema = z.object({
  ncId: z.uuid(),
  type: z.enum(NC_ACTION_TYPE),
  description: z.string().trim().min(5).max(1000),
  responsiblePositionId: z.uuid(),
  dueDate: isoDate,
})

export async function addNcAction(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = addActionSchema.safeParse(input)
    if (!p.success) return fail("Completa descripción, responsable y plazo.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("add_nc_action", {
      p_nc: p.data.ncId,
      p_type: p.data.type,
      p_description: p.data.description,
      p_responsible: p.data.responsiblePositionId,
      p_due: p.data.dueDate,
    })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

export async function completeNcAction(actionId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(actionId)) return fail(GENERIC)
    const supabase = await createClient()
    const { error } = await supabase.rpc("complete_nc_action", { p_action: actionId })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

export async function cancelNcAction(actionId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(actionId)) return fail(GENERIC)
    const supabase = await createClient()
    const { error } = await supabase.rpc("cancel_nc_action", { p_action: actionId })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

export async function verifyNc(ncId: string, effective: boolean, notes?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(ncId)) return fail(GENERIC)
    const supabase = await createClient()
    const { error } = await supabase.rpc("verify_nc", { p_nc: ncId, p_effective: effective, p_notes: notes })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

export async function cancelNc(ncId: string, reason: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(ncId) || reason.trim().length < 5) return fail("Indica el motivo de la anulación.")
    const supabase = await createClient()
    const { error } = await supabase.rpc("cancel_nc", { p_nc: ncId, p_reason: reason })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

/** Autoriza registrar evidencia en una NC: responsable de la acción o gestor del proceso. */
async function authorizeNcEvidence(ncId: string, actionId: string | null): Promise<
  { ok: true; org: string } | { ok: false; error: string }
> {
  if (!isUuid(ncId) || (actionId !== null && !isUuid(actionId))) return { ok: false, error: "Datos inválidos." }
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data: nc } = await supabase.from("nonconformities").select("id, organization_id, process_id").eq("id", ncId).maybeSingle()
  if (!nc) return { ok: false, error: "No conformidad no encontrada." }
  let isResponsible = false
  if (actionId) {
    const { data: a } = await supabase.from("nc_actions").select("responsible_position_id, nonconformity_id").eq("id", actionId).maybeSingle()
    if (!a || a.nonconformity_id !== ncId) return { ok: false, error: "Acción no encontrada." }
    isResponsible = !!user.positionId && a.responsible_position_id === user.positionId
  }
  if (!isResponsible && !canManageNonconformities(user, nc.process_id ?? undefined)) {
    return { ok: false, error: "Solo el responsable o un líder registra evidencia." }
  }
  return { ok: true, org: nc.organization_id }
}

/** URL de subida para una evidencia de NC (responsable o gestor). */
export async function prepareNcEvidenceUpload(ncId: string, actionId: string | null, fileName: string): Promise<Result<UploadTicket>> {
  return guard(async () => {
    const auth = await authorizeNcEvidence(ncId, actionId)
    if (!auth.ok) return fail(auth.error)
    if (!isEvidenceName(fileName)) return fail("Adjunta un PDF, una imagen (PNG, JPG, WebP), un CSV o un archivo de Office.")
    return ok(await createUploadTicket("nc-evidencias", stagingPath(`${auth.org}/${ncId}/${randomUUID()}`, safeFileName(fileName))))
  })
}

export async function addNcEvidence(input: {
  ncId: string
  actionId: string | null
  fileName: string
  /** Ruta devuelta por prepareNcEvidenceUpload. */
  filePath: string
  note?: string
}): Promise<Result> {
  return guard(async () => {
    const auth = await authorizeNcEvidence(input.ncId, input.actionId)
    if (!auth.ok) return fail(auth.error)
    const user = await getCurrentUser()
    // `<org>/<nc>/<uuid>/subida/<archivo>`: el uuid lo generó prepareNcEvidenceUpload.
    const base = input.filePath.split("/").slice(0, 3).join("/")
    const [org, nc, key] = base.split("/")
    if (org !== auth.org || nc !== input.ncId || !isUuid(key)) return fail("Ruta de archivo inválida.")
    const file = await promoteUpload("nc-evidencias", base, input.filePath, (ext) => EVIDENCE_EXT.includes(ext))
    const { error } = await createAdminClient().rpc("nc_add_evidence", {
      p_actor: user.id,
      p_nc: input.ncId,
      p_action: (input.actionId ?? null) as unknown as string,
      p_path: file.path,
      p_sha256: file.sha256,
      p_size: file.size,
      p_name: downloadName(String(input.fileName ?? ""), file.path),
      p_note: (input.note ?? "").trim().slice(0, 2000),
    })
    if (error) {
      await removeObjects("nc-evidencias", [file.path])
      return fail(dbMessage(error))
    }
    revalidateNc()
    return ok(undefined)
  })
}

// ---------- Auditorías internas ----------

const FINDING_TYPE = ["no_conformidad", "observacion", "oportunidad_mejora", "conformidad"] as const
const FINDING_SEVERITY = ["menor", "mayor"] as const

function revalidateAudits() {
  revalidatePath("/app/auditorias", "layout")
  revalidatePath("/app")
}

const planAuditSchema = z.object({
  title: z.string().trim().min(3).max(200),
  objective: z.string().trim().max(2000).optional(),
  criteria: z.string().trim().max(2000).optional(),
  leadAuditorId: z.uuid().nullish(),
  plannedDate: isoDate,
  processIds: z.array(z.uuid()).min(1).max(50),
})

export async function planAudit(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = planAuditSchema.safeParse(input)
    if (!p.success) return fail("Indica título, al menos un proceso y la fecha.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("plan_audit", {
      p_org: user.organization.id,
      p_title: p.data.title,
      p_objective: p.data.objective ?? "",
      p_criteria: p.data.criteria ?? "",
      p_lead: (p.data.leadAuditorId ?? null) as unknown as string,
      p_planned_date: p.data.plannedDate,
      p_process_ids: p.data.processIds,
    })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function startAudit(auditId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(auditId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("start_audit", { p_audit: auditId })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok(undefined)
  })
}

const addFindingSchema = z.object({
  auditId: z.uuid(),
  type: z.enum(FINDING_TYPE),
  processId: z.uuid().nullish(),
  description: z.string().trim().min(5).max(2000),
  criteriaRef: z.string().trim().max(60).optional(),
  severity: z.enum(FINDING_SEVERITY).optional(),
})

export async function addAuditFinding(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = addFindingSchema.safeParse(input)
    if (!p.success) return fail("Describe el hallazgo e indica su tipo.")
    const { error } = await (await createClient()).rpc("add_audit_finding", {
      p_audit: p.data.auditId,
      p_type: p.data.type,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_description: p.data.description,
      p_criteria_ref: p.data.criteriaRef ?? "",
      p_severity: p.data.severity,
    })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok(undefined)
  })
}

export async function generateNcFromFinding(findingId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(findingId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_finding", { p_finding: findingId })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function closeAudit(auditId: string, conclusions: string): Promise<Result> {
  return guard(async () => {
    const text = conclusions.trim()
    if (!isUuid(auditId) || text.length < 1 || text.length > 4000) return fail("Escribe las conclusiones.")
    const { error } = await (await createClient()).rpc("close_audit", { p_audit: auditId, p_conclusions: text })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok(undefined)
  })
}

export async function cancelAudit(auditId: string, reason: string): Promise<Result> {
  return guard(async () => {
    const text = reason.trim()
    if (!isUuid(auditId) || text.length < 5 || text.length > 2000) return fail("Indica el motivo de la cancelación.")
    const { error } = await (await createClient()).rpc("cancel_audit", { p_audit: auditId, p_reason: text })
    if (error) return fail(dbMessage(error))
    revalidateAudits()
    return ok(undefined)
  })
}

// ---------- Indicadores de gestión / KPIs ----------

const DIRECTION = ["mayor_mejor", "menor_mejor", "rango"] as const
const FREQUENCY = ["mensual", "bimestral", "trimestral", "semestral", "anual"] as const

function revalidateIndicators() {
  revalidatePath("/app/indicadores", "layout")
  revalidatePath("/app")
}

const indicatorSchema = z.object({
  name: z.string().trim().min(3).max(200),
  processId: z.uuid(),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(20),
  direction: z.enum(DIRECTION),
  target: z.number().finite(),
  targetMax: z.number().finite().nullish(),
  tolerancePct: z.number().min(0).max(100).nullish(),
  frequency: z.enum(FREQUENCY),
  ownerId: z.uuid().nullish(),
  isRate: z.boolean().optional(),
})

export async function createIndicator(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = indicatorSchema.safeParse(input)
    if (!p.success) return fail("Indica nombre, proceso, unidad y meta.")
    if (p.data.direction === "rango" && (p.data.targetMax === null || p.data.targetMax === undefined)) {
      return fail("Indica la meta máxima del rango.")
    }
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_indicator", {
      p_org: user.organization.id,
      p_name: p.data.name,
      p_process: p.data.processId,
      p_description: p.data.description ?? "",
      p_unit: p.data.unit,
      p_direction: p.data.direction,
      p_target: p.data.target,
      p_target_max: (p.data.targetMax ?? null) as unknown as number,
      p_tolerance: (p.data.tolerancePct ?? null) as unknown as number,
      p_frequency: p.data.frequency,
      p_owner: (p.data.ownerId ?? null) as unknown as string,
      p_is_rate: p.data.isRate ?? false,
    })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateIndicator(indicatorId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(indicatorId)) return fail(GENERIC)
    const p = indicatorSchema.omit({ processId: true }).safeParse(input)
    if (!p.success) return fail("Revisa los datos del indicador.")
    if (p.data.direction === "rango" && (p.data.targetMax === null || p.data.targetMax === undefined)) {
      return fail("Indica la meta máxima del rango.")
    }
    const { error } = await (await createClient()).rpc("update_indicator", {
      p_indicator: indicatorId,
      p_name: p.data.name,
      p_description: p.data.description ?? "",
      p_unit: p.data.unit,
      p_direction: p.data.direction,
      p_target: p.data.target,
      p_target_max: (p.data.targetMax ?? null) as unknown as number,
      p_tolerance: (p.data.tolerancePct ?? null) as unknown as number,
      p_frequency: p.data.frequency,
      p_owner: (p.data.ownerId ?? null) as unknown as string,
      p_is_rate: p.data.isRate ?? false,
    })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok(undefined)
  })
}

export async function archiveIndicator(indicatorId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(indicatorId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("archive_indicator", { p_indicator: indicatorId })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok(undefined)
  })
}

export async function unarchiveIndicator(indicatorId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(indicatorId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("unarchive_indicator", { p_indicator: indicatorId })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok(undefined)
  })
}

const measurementSchema = z.object({
  indicatorId: z.uuid(),
  period: isoDate,
  value: z.number().finite().nullish(),
  numerator: z.number().finite().nullish(),
  denominator: z.number().finite().nullish(),
  note: z.string().trim().max(2000).optional(),
})

export async function recordMeasurement(input: unknown): Promise<Result<{ compliance: string }>> {
  return guard(async () => {
    const p = measurementSchema.safeParse(input)
    if (!p.success) return fail("Captura el periodo y el valor.")
    const { data, error } = await (await createClient()).rpc("record_measurement", {
      p_indicator: p.data.indicatorId,
      p_period: p.data.period,
      p_value: (p.data.value ?? null) as unknown as number,
      p_numerator: (p.data.numerator ?? null) as unknown as number,
      p_denominator: (p.data.denominator ?? null) as unknown as number,
      p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok({ compliance: (data as unknown as string) ?? "" })
  })
}

export async function generateNcFromMeasurement(measurementId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(measurementId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_measurement", { p_measurement: measurementId })
    if (error) return fail(dbMessage(error))
    revalidateIndicators()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

// ---------- Revisión por la dirección ----------

const OUTPUT_KIND = ["decision", "accion_mejora", "recurso", "cambio_sgc"] as const

function revalidateReviews() {
  revalidatePath("/app/revisiones", "layout")
  revalidatePath("/app")
}

const createReviewSchema = z.object({
  title: z.string().trim().min(3).max(200),
  periodStart: isoDate,
  periodEnd: isoDate,
  meetingDate: isoDate,
  scope: z.string().trim().max(2000).optional(),
})

export async function createReview(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = createReviewSchema.safeParse(input)
    if (!p.success) return fail("Indica título, periodo y fecha de la reunión.")
    if (p.data.periodEnd < p.data.periodStart) return fail("El fin del periodo no puede ser anterior al inicio.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_review", {
      p_org: user.organization.id,
      p_title: p.data.title,
      p_start: p.data.periodStart,
      p_end: p.data.periodEnd,
      p_meeting: p.data.meetingDate,
      p_scope: p.data.scope ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function refreshReviewSnapshot(reviewId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reviewId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("refresh_review_snapshot", { p_review: reviewId })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok(undefined)
  })
}

const reviewInputsSchema = z.object({
  attendees: z.string().trim().max(2000).optional(),
  scope: z.string().trim().max(2000).optional(),
  inputs: z.object({
    satisfaccion: z.string().max(4000),
    retroalimentacion: z.string().max(4000),
    proveedores: z.string().max(4000),
    recursos: z.string().max(4000),
    mejora: z.string().max(4000),
  }),
})

export async function updateReviewInputs(reviewId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reviewId)) return fail(GENERIC)
    const p = reviewInputsSchema.safeParse(input)
    if (!p.success) return fail("Revisa las entradas del acta.")
    const { error } = await (await createClient()).rpc("update_review", {
      p_review: reviewId,
      p_attendees: p.data.attendees ?? "",
      p_scope: p.data.scope ?? "",
      p_inputs: p.data.inputs,
    })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok(undefined)
  })
}

const addOutputSchema = z.object({
  reviewId: z.uuid(),
  kind: z.enum(OUTPUT_KIND),
  description: z.string().trim().min(5).max(2000),
  responsibleId: z.uuid().nullish(),
  dueDate: isoDate.nullish(),
})

export async function addReviewOutput(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = addOutputSchema.safeParse(input)
    if (!p.success) return fail("Describe la decisión e indica su tipo.")
    const { error } = await (await createClient()).rpc("add_review_output", {
      p_review: p.data.reviewId,
      p_kind: p.data.kind,
      p_description: p.data.description,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_due: (p.data.dueDate ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok(undefined)
  })
}

export async function generateNcFromOutput(outputId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_output", { p_output: outputId })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function cancelReview(reviewId: string, reason: string): Promise<Result> {
  return guard(async () => {
    const text = reason.trim()
    if (!isUuid(reviewId) || text.length < 5 || text.length > 2000) return fail("Indica el motivo de la cancelación.")
    const { error } = await (await createClient()).rpc("cancel_review", { p_review: reviewId, p_reason: text })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok(undefined)
  })
}

/** Cierra y firma el acta: reautentica (ADR-004), registra hash + IP, y llama al RPC. */
export async function closeReview(input: { reviewId: string; password: string }): Promise<Result> {
  return guard(async () => {
    if (!isUuid(input.reviewId)) return fail(GENERIC)
    if (!input.password) return fail("Escribe tu contraseña para firmar.")
    const user = await getCurrentUser()
    if (!(await withinLimits([["firma:usuario", user.id]], { failClosed: true }))) return fail(TOO_MANY)
    const ip = await clientIp()
    const ephemeral = createEphemeralClient(ip)
    const { data: reauth, error: authErr } = await ephemeral.auth.signInWithPassword({ email: user.email, password: input.password })
    if (authErr || reauth.user?.id !== user.id) return fail("La contraseña no es correcta. El acta no se cerró.")
    await ephemeral.auth.signOut({ scope: "local" })

    const reauthAt = new Date().toISOString()
    const hash = await sha256Hex(`${input.reviewId}|${user.id}|${reauthAt}`)
    const h = await headers()
    // close_review es admin-only (AUD MED-01): el único camino para firmar pasa por esta acción, que
    // ya reautenticó contra Auth. Se pasa el aprobador explícito porque bajo service_role no hay auth.uid().
    const { error } = await createAdminClient().rpc("close_review", {
      p_review: input.reviewId,
      p_approver: user.id,
      p_reauth_at: reauthAt,
      p_hash: hash,
      p_ip: ip ?? undefined,
      p_ua: (h.get("user-agent") ?? "").slice(0, 400),
    })
    if (error) return fail(dbMessage(error))
    revalidateReviews()
    return ok(undefined)
  })
}

// ---------- Competencias (ISO 7.2) ----------

function revalidateCompetencies() {
  revalidatePath("/app/competencias", "layout")
  revalidatePath("/app")
}

const KINDS = ["educacion", "formacion", "habilidad", "experiencia"] as const
const competencySchema = z.object({
  name: z.string().trim().min(2).max(160),
  kind: z.enum(KINDS),
  description: z.string().trim().max(2000).optional(),
})

export async function createCompetency(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = competencySchema.safeParse(input)
    if (!p.success) return fail("Revisa el nombre y el tipo de la competencia.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_competency", {
      p_org: user.organization.id, p_name: p.data.name, p_kind: p.data.kind, p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok({ id: (data as string) ?? "" })
  })
}

export async function updateCompetency(competencyId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(competencyId)) return fail(GENERIC)
    const p = competencySchema.safeParse(input)
    if (!p.success) return fail("Revisa el nombre y el tipo de la competencia.")
    const { error } = await (await createClient()).rpc("update_competency", {
      p_competency: competencyId, p_name: p.data.name, p_kind: p.data.kind, p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok(undefined)
  })
}

export async function archiveCompetency(competencyId: string, archive: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(competencyId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("archive_competency", { p_competency: competencyId, p_archive: archive })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok(undefined)
  })
}

const requirementSchema = z.object({
  positionId: z.uuid(),
  competencyId: z.uuid(),
  level: z.number().int().min(1).max(3),
  mandatory: z.boolean(),
  note: z.string().trim().max(1000).optional(),
})

export async function setPositionRequirement(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = requirementSchema.safeParse(input)
    if (!p.success) return fail("Revisa la competencia y el nivel.")
    const { error } = await (await createClient()).rpc("set_position_requirement", {
      p_position: p.data.positionId, p_competency: p.data.competencyId, p_level: p.data.level,
      p_mandatory: p.data.mandatory, p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok(undefined)
  })
}

export async function removePositionRequirement(reqId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reqId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("remove_position_requirement", { p_req: reqId })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok(undefined)
  })
}

const trainingSchema = z.object({
  title: z.string().trim().min(3).max(200),
  kind: z.enum(["interna", "externa"]),
  provider: z.string().trim().max(200).optional(),
  trainingDate: isoDate,
  hours: z.number().min(0).max(100000).nullish(),
  processId: z.uuid().nullish(),
  note: z.string().trim().max(2000).optional(),
})

export async function createTraining(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = trainingSchema.safeParse(input)
    if (!p.success) return fail("Revisa el título, el tipo y la fecha de la formación.")
    if (p.data.trainingDate > todayIsoDate()) return fail("La fecha no puede ser futura.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_training", {
      p_org: user.organization.id, p_title: p.data.title, p_kind: p.data.kind, p_provider: p.data.provider ?? "",
      p_date: p.data.trainingDate, p_hours: (p.data.hours ?? null) as unknown as number,
      p_process: (p.data.processId ?? null) as unknown as string, p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok({ id: (data as string) ?? "" })
  })
}

const attendeeSchema = z.object({
  trainingId: z.uuid(),
  membershipId: z.uuid(),
  result: z.enum(["aprobado", "no_aprobado", "asistio"]),
  validUntil: isoDate.nullish(),
})

export async function addTrainingAttendee(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = attendeeSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del asistente.")
    const { error } = await (await createClient()).rpc("add_training_attendee", {
      p_training: p.data.trainingId, p_membership: p.data.membershipId, p_result: p.data.result,
      p_valid_until: (p.data.validUntil ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok(undefined)
  })
}

const assessSchema = z.object({
  membershipId: z.uuid(),
  competencyId: z.uuid(),
  positionId: z.uuid(),
  assessedLevel: z.number().int().min(0).max(3),
  nextReview: isoDate.nullish(),
  note: z.string().trim().max(2000).optional(),
  createTask: z.boolean().optional(),
})

export async function assessCompetency(input: unknown): Promise<Result<{ status: string }>> {
  return guard(async () => {
    const p = assessSchema.safeParse(input)
    if (!p.success) return fail("Revisa la evaluación.")
    const { data, error } = await (await createClient()).rpc("assess_competency", {
      p_membership: p.data.membershipId, p_competency: p.data.competencyId, p_position: p.data.positionId,
      p_assessed: p.data.assessedLevel, p_next_review: (p.data.nextReview ?? null) as unknown as string,
      p_note: p.data.note ?? "", p_create_task: p.data.createTask ?? false,
    })
    if (error) return fail(dbMessage(error))
    revalidateCompetencies()
    return ok({ status: data?.[0]?.status ?? "" })
  })
}

// ---------- Proveedores (ISO 8.4) ----------

function revalidateSuppliers() {
  revalidatePath("/app/proveedores", "layout")
  revalidatePath("/app")
}

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(200),
  nit: z.string().trim().max(40).optional(),
  kind: z.enum(["bien", "servicio", "ambos"]),
  category: z.string().trim().max(120).optional(),
  criticality: z.enum(["alta", "media", "baja"]),
  processId: z.uuid().nullish(),
  contactName: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(60).optional(),
})

export async function createSupplier(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = supplierSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del proveedor.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_supplier", {
      p_org: user.organization.id, p_name: p.data.name, p_nit: p.data.nit ?? "", p_kind: p.data.kind,
      p_category: p.data.category ?? "", p_criticality: p.data.criticality,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_contact_name: p.data.contactName ?? "", p_contact_email: p.data.contactEmail ?? "", p_contact_phone: p.data.contactPhone ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateSupplier(supplierId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(supplierId)) return fail(GENERIC)
    const p = supplierSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del proveedor.")
    const { error } = await (await createClient()).rpc("update_supplier", {
      p_supplier: supplierId, p_name: p.data.name, p_nit: p.data.nit ?? "", p_kind: p.data.kind,
      p_category: p.data.category ?? "", p_criticality: p.data.criticality,
      p_contact_name: p.data.contactName ?? "", p_contact_email: p.data.contactEmail ?? "", p_contact_phone: p.data.contactPhone ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok(undefined)
  })
}

export async function setSupplierActive(supplierId: string, active: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(supplierId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_supplier_active", { p_supplier: supplierId, p_active: active })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok(undefined)
  })
}

const score = z.number().int().min(0).max(100)
const evaluateSchema = z.object({
  supplierId: z.uuid(),
  kind: z.enum(["inicial", "periodica"]),
  evalDate: isoDate,
  quality: score,
  delivery: score,
  service: score,
  nextEval: isoDate.nullish(),
  note: z.string().trim().max(2000).optional(),
})

export async function evaluateSupplier(input: unknown): Promise<Result<{ result: string }>> {
  return guard(async () => {
    const p = evaluateSchema.safeParse(input)
    if (!p.success) return fail("Revisa la evaluación: cada criterio va de 0 a 100.")
    if (p.data.evalDate > todayIsoDate()) return fail("La fecha de evaluación no puede ser futura.")
    const { data, error } = await (await createClient()).rpc("evaluate_supplier", {
      p_supplier: p.data.supplierId, p_kind: p.data.kind, p_eval_date: p.data.evalDate,
      p_quality: p.data.quality, p_delivery: p.data.delivery, p_service: p.data.service,
      p_next_eval: (p.data.nextEval ?? null) as unknown as string, p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok({ result: data?.[0]?.result ?? "" })
  })
}

export async function exportSuppliersCsv(): Promise<string> {
  const rows = await listSuppliers()
  const STATUS: Record<string, string> = { pendiente: "Pendiente", aprobado: "Aprobado", condicionado: "Condicionado", rechazado: "Rechazado", inactivo: "Inactivo" }
  const KIND: Record<string, string> = { bien: "Bien", servicio: "Servicio", ambos: "Bien y servicio" }
  const CRIT: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Proveedor", value: (r) => r.name },
    { header: "Tipo", value: (r) => KIND[r.kind] },
    { header: "Criticidad", value: (r) => CRIT[r.criticality] },
    { header: "Estado", value: (r) => STATUS[r.status] },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Próxima reevaluación", value: (r) => (r.nextEvalDate ? formatDate(r.nextEvalDate) : null) },
  ])
}

// ---------- PQRS y satisfacción del cliente (ISO 9.1.2) ----------

function revalidatePqrs() {
  revalidatePath("/app/pqrs", "layout")
  revalidatePath("/app")
}

const PQRS_TYPES = ["peticion", "queja", "reclamo", "sugerencia", "felicitacion"] as const
const PQRS_CHANNELS = ["correo", "telefono", "web", "presencial", "otro"] as const
const pqrsSchema = z.object({
  type: z.enum(PQRS_TYPES),
  channel: z.enum(PQRS_CHANNELS),
  customerName: z.string().trim().max(200).optional(),
  customerContact: z.string().trim().max(200).optional(),
  processId: z.uuid().nullish(),
  description: z.string().trim().min(5).max(4000),
  receivedDate: isoDate,
})

export async function createPqrs(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = pqrsSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la PQRS.")
    if (p.data.receivedDate > todayIsoDate()) return fail("La fecha de recepción no puede ser futura.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_pqrs", {
      p_org: user.organization.id, p_type: p.data.type, p_channel: p.data.channel,
      p_customer_name: p.data.customerName ?? "", p_customer_contact: p.data.customerContact ?? "",
      p_process: (p.data.processId ?? null) as unknown as string, p_description: p.data.description,
      p_received: p.data.receivedDate, p_due_days: 15,
    })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    after(() => deliverChat().catch((e) => console.error("chat", e)))
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

const pqrsEditSchema = pqrsSchema.extend({ dueDate: isoDate })
export async function updatePqrs(caseId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(caseId)) return fail(GENERIC)
    const p = pqrsEditSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la PQRS.")
    const { error } = await (await createClient()).rpc("update_pqrs", {
      p_case: caseId, p_type: p.data.type, p_channel: p.data.channel,
      p_customer_name: p.data.customerName ?? "", p_customer_contact: p.data.customerContact ?? "",
      p_process: (p.data.processId ?? null) as unknown as string, p_description: p.data.description,
      p_received: p.data.receivedDate, p_due: p.data.dueDate,
    })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

const manageSchema = z.object({
  responsibleId: z.uuid().nullish(),
  processId: z.uuid().nullish(),
  status: z.enum(["recibida", "en_gestion", "resuelta"]),
})
export async function managePqrs(caseId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(caseId)) return fail(GENERIC)
    const p = manageSchema.safeParse(input)
    if (!p.success) return fail("Revisa la gestión de la PQRS.")
    const { error } = await (await createClient()).rpc("manage_pqrs", {
      p_case: caseId, p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_process: (p.data.processId ?? null) as unknown as string, p_status: p.data.status,
    })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

export async function respondPqrs(caseId: string, response: string): Promise<Result> {
  return guard(async () => {
    const text = response.trim()
    if (!isUuid(caseId) || text.length < 3 || text.length > 4000) return fail("Escribe la respuesta al cliente.")
    const { error } = await (await createClient()).rpc("respond_pqrs", { p_case: caseId, p_response: text })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

export async function closePqrs(caseId: string, satisfied: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(caseId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_pqrs", { p_case: caseId, p_satisfied: satisfied })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

export async function cancelPqrs(caseId: string, reason: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(caseId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("cancel_pqrs", { p_case: caseId, p_reason: reason.trim().slice(0, 2000) })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

export async function generateNcFromPqrs(caseId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(caseId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_pqrs", { p_case: caseId })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

const satisfactionSchema = z.object({
  period: isoDate,
  method: z.enum(["encuesta", "nps", "csat", "otro"]),
  score: z.number().min(0).max(100),
  responses: z.number().int().min(0).max(1_000_000).nullish(),
  note: z.string().trim().max(2000).optional(),
})
export async function recordSatisfaction(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = satisfactionSchema.safeParse(input)
    if (!p.success) return fail("Revisa la medición: el puntaje va de 0 a 100.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { error } = await (await createClient()).rpc("record_satisfaction", {
      p_org: user.organization.id, p_period: p.data.period, p_method: p.data.method,
      p_score: p.data.score, p_responses: (p.data.responses ?? null) as unknown as number, p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok(undefined)
  })
}

export async function exportPqrsCsv(): Promise<string> {
  const rows = await listPqrs()
  const TYPE: Record<string, string> = { peticion: "Petición", queja: "Queja", reclamo: "Reclamo", sugerencia: "Sugerencia", felicitacion: "Felicitación" }
  const STATUS: Record<string, string> = { recibida: "Recibida", en_gestion: "En gestión", resuelta: "Resuelta", cerrada: "Cerrada", anulada: "Anulada" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Tipo", value: (r) => TYPE[r.type] },
    { header: "Cliente", value: (r) => r.customerName },
    { header: "Estado", value: (r) => STATUS[r.status] },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Vence", value: (r) => formatDate(r.dueDate) },
  ])
}

// ---------- Actas/reuniones y Objetivos de calidad / BSC (ISO 6.2) ----------

function revalidateMinutes() {
  revalidatePath("/app/actas", "layout")
  revalidatePath("/app")
}
function revalidateObjectives() {
  revalidatePath("/app/objetivos")
  revalidatePath("/app")
}

const minuteSchema = z.object({
  title: z.string().trim().min(3).max(300),
  meetingType: z.string().trim().min(1).max(60),
  meetingDate: isoDate,
  processId: z.uuid().nullish(),
  attendees: z.string().trim().max(5000).optional(),
  agenda: z.string().trim().max(10000).optional(),
})

export async function createMinute(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = minuteSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del acta.")
    if (p.data.meetingDate > todayIsoDate()) return fail("La fecha de la reunión no puede ser futura.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_minute", {
      p_org: user.organization.id, p_title: p.data.title, p_type: p.data.meetingType, p_date: p.data.meetingDate,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_attendees: p.data.attendees ?? "", p_agenda: p.data.agenda ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateMinutes()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateMinute(minuteId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(minuteId)) return fail(GENERIC)
    const p = minuteSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del acta.")
    const { error } = await (await createClient()).rpc("update_minute", {
      p_minute: minuteId, p_title: p.data.title, p_type: p.data.meetingType, p_date: p.data.meetingDate,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_attendees: p.data.attendees ?? "", p_agenda: p.data.agenda ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateMinutes()
    return ok(undefined)
  })
}

export async function closeMinute(minuteId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(minuteId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_minute", { p_minute: minuteId })
    if (error) return fail(dbMessage(error))
    revalidateMinutes()
    return ok(undefined)
  })
}

const commitmentSchema = z.object({
  description: z.string().trim().min(3).max(2000),
  responsibleId: z.uuid().nullish(),
  dueDate: isoDate.nullish(),
})
export async function addCommitment(minuteId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(minuteId)) return fail(GENERIC)
    const p = commitmentSchema.safeParse(input)
    if (!p.success) return fail("Describe el compromiso.")
    const { error } = await (await createClient()).rpc("add_commitment", {
      p_minute: minuteId, p_description: p.data.description,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_due: (p.data.dueDate ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateMinutes()
    return ok(undefined)
  })
}

export async function completeCommitment(commitmentId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(commitmentId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("complete_commitment", { p_commitment: commitmentId })
    if (error) return fail(dbMessage(error))
    revalidateMinutes()
    return ok(undefined)
  })
}

const PERSPECTIVES = ["financiera", "cliente", "procesos", "aprendizaje"] as const
const OBJECTIVE_STATUSES = ["activo", "cumplido", "no_cumplido", "archivado"] as const
const objectiveSchema = z.object({
  description: z.string().trim().min(5).max(2000),
  perspective: z.enum(PERSPECTIVES),
  processId: z.uuid().nullish(),
  targetText: z.string().trim().max(400).optional(),
  horizonYear: z.number().int().min(2000).max(2100).nullish(),
  indicatorIds: z.array(z.uuid()).max(50).optional(),
})

export async function createObjective(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = objectiveSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del objetivo.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_objective", {
      p_org: user.organization.id, p_description: p.data.description, p_perspective: p.data.perspective,
      p_process: (p.data.processId ?? null) as unknown as string, p_target: p.data.targetText ?? "",
      p_horizon: (p.data.horizonYear ?? null) as unknown as number, p_indicator_ids: p.data.indicatorIds ?? [],
    })
    if (error) return fail(dbMessage(error))
    revalidateObjectives()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

const objectiveEditSchema = objectiveSchema.extend({ status: z.enum(OBJECTIVE_STATUSES) })
export async function updateObjective(objectiveId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(objectiveId)) return fail(GENERIC)
    const p = objectiveEditSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del objetivo.")
    const { error } = await (await createClient()).rpc("update_objective", {
      p_objective: objectiveId, p_description: p.data.description, p_perspective: p.data.perspective,
      p_process: (p.data.processId ?? null) as unknown as string, p_target: p.data.targetText ?? "",
      p_horizon: (p.data.horizonYear ?? null) as unknown as number, p_status: p.data.status,
      p_indicator_ids: p.data.indicatorIds ?? [],
    })
    if (error) return fail(dbMessage(error))
    revalidateObjectives()
    return ok(undefined)
  })
}

export async function setObjectiveStatus(objectiveId: string, status: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(objectiveId)) return fail(GENERIC)
    if (!(OBJECTIVE_STATUSES as readonly string[]).includes(status)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_objective_status", { p_objective: objectiveId, p_status: status })
    if (error) return fail(dbMessage(error))
    revalidateObjectives()
    return ok(undefined)
  })
}

export async function exportMinutesCsv(): Promise<string> {
  const rows = await listMinutes()
  const STATUS: Record<string, string> = { borrador: "Borrador", cerrada: "Cerrada" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Título", value: (r) => r.title },
    { header: "Tipo", value: (r) => r.meetingType },
    { header: "Fecha", value: (r) => formatDate(r.meetingDate) },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Estado", value: (r) => STATUS[r.status] ?? r.status },
    { header: "Compromisos", value: (r) => String(r.commitmentCount) },
    { header: "Pendientes", value: (r) => String(r.pendingCount) },
  ])
}

export async function exportObjectivesCsv(): Promise<string> {
  const rows = await listObjectives()
  const PERSP: Record<string, string> = { financiera: "Financiera", cliente: "Cliente", procesos: "Procesos internos", aprendizaje: "Aprendizaje y crecimiento" }
  const STATUS: Record<string, string> = { activo: "Activo", cumplido: "Cumplido", no_cumplido: "No cumplido", archivado: "Archivado" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Objetivo", value: (r) => r.description },
    { header: "Perspectiva", value: (r) => PERSP[r.perspective] ?? r.perspective },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Meta", value: (r) => r.targetText },
    { header: "Horizonte", value: (r) => (r.horizonYear ? String(r.horizonYear) : null) },
    { header: "Estado", value: (r) => STATUS[r.status] ?? r.status },
    { header: "Indicadores", value: (r) => String(r.indicatorCount) },
    { header: "Avance %", value: (r) => (r.progressPct === null ? "Sin datos" : String(r.progressPct)) },
  ])
}

// ---------- Tablero gerencial (v1.1-1): exportación CSV por panel ----------

export type DashboardCsvPanel = "no-conformidades" | "indicadores" | "objetivos" | "pqrs"

const PERSP_LABEL: Record<string, string> = {
  financiera: "Financiera", cliente: "Cliente", procesos: "Procesos internos", aprendizaje: "Aprendizaje y crecimiento",
}

export async function exportDashboardCsv(
  panel: DashboardCsvPanel,
  filters: { processId: string | null; year: number },
): Promise<string> {
  const year = Number.isInteger(filters.year) ? filters.year : new Date().getFullYear()
  const processId = typeof filters.processId === "string" && isUuid(filters.processId) ? filters.processId : null
  const d = await getDashboard({ processId, year })

  if (panel === "no-conformidades") {
    const rows = [
      ...d.nc.byStatus.map((r) => ({ grupo: "Estado", etiqueta: r.label, valor: r.value })),
      ...d.nc.bySeverity.map((r) => ({ grupo: "Severidad", etiqueta: r.label, valor: r.value })),
    ]
    return toCsv(rows, [
      { header: "Grupo", value: (r) => r.grupo },
      { header: "Etiqueta", value: (r) => r.etiqueta },
      { header: "Cantidad", value: (r) => String(r.valor) },
    ])
  }
  if (panel === "indicadores") {
    const i = d.indicators
    const rows = [
      { k: "Activos", v: i.active },
      { k: "Cumple", v: i.cumple },
      { k: "En riesgo", v: i.atRisk },
      { k: "No cumple", v: i.notMeeting },
      { k: "Sin medición", v: i.withoutMeasurement },
      { k: "% cumplimiento", v: i.compliancePct ?? 0 },
    ]
    return toCsv(rows, [
      { header: "Indicador", value: (r) => r.k },
      { header: "Valor", value: (r) => String(r.v) },
    ])
  }
  if (panel === "objetivos") {
    return toCsv(d.objectives.byPerspective, [
      { header: "Perspectiva", value: (r) => PERSP_LABEL[r.perspective] ?? r.perspective },
      { header: "Objetivos", value: (r) => String(r.count) },
      { header: "Avance %", value: (r) => (r.avgProgress === null ? "Sin datos" : String(r.avgProgress)) },
    ])
  }
  // pqrs + satisfacción
  const rows = [
    { k: "PQRS abiertas", v: String(d.pqrs.open) },
    { k: "PQRS vencidas", v: String(d.pqrs.overdue) },
    ...d.satisfaction.trend.map((t) => ({ k: `Satisfacción ${t.period}`, v: String(t.score) })),
  ]
  return toCsv(rows, [
    { header: "Concepto", value: (r) => r.k },
    { header: "Valor", value: (r) => r.v },
  ])
}

// ---------- Encuesta de satisfacción enviable (v1.1-2) ----------

function revalidateSurveys() {
  revalidatePath("/app/pqrs", "layout")
  revalidatePath("/app")
}

const surveySchema = z.object({
  title: z.string().trim().min(3).max(200),
  method: z.enum(["encuesta", "nps", "csat"]),
  scale: z.enum(["0_100", "1_5", "nps_0_10"]),
  period: isoDate,
  processId: z.uuid().nullish(),
})

export async function createSurvey(input: unknown): Promise<Result<{ code: string; token: string }>> {
  return guard(async () => {
    const p = surveySchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la encuesta.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_survey", {
      p_org: user.organization.id, p_title: p.data.title, p_method: p.data.method,
      p_scale: p.data.scale, p_period: p.data.period, p_process: (p.data.processId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateSurveys()
    return ok({ code: data?.[0]?.code ?? "", token: data?.[0]?.token ?? "" })
  })
}

export async function closeSurvey(surveyId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(surveyId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_survey", { p_survey: surveyId })
    if (error) return fail(dbMessage(error))
    revalidateSurveys()
    return ok(undefined)
  })
}

/** Envío público de una respuesta (sin sesión): CAPTCHA + rate-limit por IP + token, luego RPC anónimo. */
export async function submitSurveyResponse(input: {
  token: string
  raw: number
  comment?: string
  captchaToken: string
}): Promise<Result> {
  return guard(async () => {
    const token = String(input.token ?? "")
    if (token.length < 16 || token.length > 128) return fail("Esta encuesta no está disponible.")
    if (typeof input.raw !== "number" || !Number.isFinite(input.raw)) return fail("Indica tu puntaje.")
    const comment = (input.comment ?? "").trim().slice(0, 1000)
    const ip = await clientIp()
    if (!(await verifyTurnstile(input.captchaToken, "encuesta", ip))) return fail(CAPTCHA_FAILED)
    if (!(await withinLimits([["encuesta:ip", ip], ["encuesta:token_ip", `${token}|${ipKey(ip) ?? "x"}`]]))) return fail(TOO_MANY)
    const ipHash = ip ? sha256Hex(`${ip}|${token}`) : null
    const { error } = await (await createClient()).rpc("submit_survey_response", {
      p_token: token, p_raw: input.raw, p_comment: comment || "", p_ip_hash: ipHash ?? "",
    })
    if (error) return fail(dbMessage(error, "Esta encuesta no está disponible."))
    return ok(undefined)
  })
}

export async function exportSurveyCsv(surveyId: string): Promise<string> {
  const rows = await listSurveyResponses(surveyId)
  return toCsv(rows, [
    { header: "Fecha", value: (r) => formatDate(r.createdAt) },
    { header: "Puntaje (0-100)", value: (r) => String(r.score) },
    { header: "Comentario", value: (r) => r.comment },
  ])
}

// ---------- Requisitos legales (v1.1-3) ----------

function revalidateLegal() {
  revalidatePath("/app/requisitos-legales", "layout")
  revalidatePath("/app")
}

const LEGAL_SOURCES = ["ley", "decreto", "resolucion", "norma_iso", "contractual", "otro"] as const
const LEGAL_FREQ = ["semestral", "anual", "bienal"] as const
const legalRequirementSchema = z.object({
  title: z.string().trim().min(3).max(300),
  sourceType: z.enum(LEGAL_SOURCES),
  reference: z.string().trim().min(1).max(300),
  issuer: z.string().trim().max(200).optional(),
  description: z.string().trim().min(3).max(4000),
  processId: z.uuid().nullish(),
  url: z.string().trim().max(500).optional(),
  frequency: z.enum(LEGAL_FREQ),
})

export async function createRequirement(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = legalRequirementSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del requisito.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_requirement", {
      p_org: user.organization.id, p_title: p.data.title, p_source: p.data.sourceType, p_reference: p.data.reference,
      p_issuer: p.data.issuer ?? "", p_description: p.data.description, p_process: (p.data.processId ?? null) as unknown as string,
      p_url: p.data.url ?? "", p_frequency: p.data.frequency,
    })
    if (error) return fail(dbMessage(error))
    revalidateLegal()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateRequirement(reqId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reqId)) return fail(GENERIC)
    const p = legalRequirementSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del requisito.")
    const { error } = await (await createClient()).rpc("update_requirement", {
      p_req: reqId, p_title: p.data.title, p_source: p.data.sourceType, p_reference: p.data.reference,
      p_issuer: p.data.issuer ?? "", p_description: p.data.description, p_process: (p.data.processId ?? null) as unknown as string,
      p_url: p.data.url ?? "", p_frequency: p.data.frequency,
    })
    if (error) return fail(dbMessage(error))
    revalidateLegal()
    return ok(undefined)
  })
}

export async function derogateRequirement(reqId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reqId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("derogate_requirement", { p_req: reqId })
    if (error) return fail(dbMessage(error))
    revalidateLegal()
    return ok(undefined)
  })
}

const evalSchema = z.object({
  compliance: z.enum(["cumple", "parcial", "no_cumple"]),
  evidence: z.string().trim().min(1).max(4000),
  evaluatedAt: isoDate,
  note: z.string().trim().max(2000).optional(),
})
export async function evaluateRequirement(reqId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(reqId)) return fail(GENERIC)
    const p = evalSchema.safeParse(input)
    if (!p.success) return fail("Registra el cumplimiento y la evidencia.")
    if (p.data.evaluatedAt > todayIsoDate()) return fail("La fecha de evaluación no puede ser futura.")
    const { error } = await (await createClient()).rpc("evaluate_requirement", {
      p_req: reqId, p_compliance: p.data.compliance, p_evidence: p.data.evidence,
      p_evaluated: p.data.evaluatedAt, p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateLegal()
    return ok(undefined)
  })
}

export async function exportLegalCsv(): Promise<string> {
  const rows = await listLegalRequirements()
  const SRC: Record<string, string> = { ley: "Ley", decreto: "Decreto", resolucion: "Resolución", norma_iso: "Norma ISO", contractual: "Contractual", otro: "Otro" }
  const COMP: Record<string, string> = { cumple: "Cumple", parcial: "Parcial", no_cumple: "No cumple", no_evaluado: "No evaluado" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Requisito", value: (r) => r.title },
    { header: "Fuente", value: (r) => SRC[r.sourceType] ?? r.sourceType },
    { header: "Referencia", value: (r) => r.reference },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Cumplimiento", value: (r) => COMP[r.compliance] ?? r.compliance },
    { header: "Estado", value: (r) => (r.status === "derogado" ? "Derogado" : "Vigente") },
    { header: "Próxima evaluación", value: (r) => (r.nextEvalDate ? formatDate(r.nextEvalDate) : null) },
  ])
}

// ---------- Multi-norma y peligros SST (v1.1-4) ----------

function revalidateHazards() {
  revalidatePath("/app/peligros", "layout")
  revalidatePath("/app")
}
const revalidateNorms = () => { revalidatePath("/app/admin"); revalidatePath("/app", "layout") }

export async function upsertNorm(input: { code: string; name: string }): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const code = (input.code ?? "").trim()
    const name = (input.name ?? "").trim()
    if (code.length < 1 || code.length > 40 || name.length < 1 || name.length > 160) return fail("Revisa el código y el nombre de la norma.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("upsert_norm", { p_org: user.organization.id, p_code: code, p_name: name })
    if (error) return fail(dbMessage(error))
    revalidateNorms()
    return ok({ id: data as unknown as string })
  })
}

export async function setNormActive(normId: string, active: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(normId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_norm_active", { p_norm: normId, p_active: active })
    if (error) return fail(dbMessage(error))
    revalidateNorms()
    return ok(undefined)
  })
}

const NORM_ENTITY_TYPES = ["proceso", "documento", "riesgo", "no_conformidad", "objetivo", "requisito_legal", "peligro"] as const
export async function setEntityNorms(entityType: string, entityId: string, normIds: string[]): Promise<Result> {
  return guard(async () => {
    if (!isUuid(entityId)) return fail(GENERIC)
    if (!(NORM_ENTITY_TYPES as readonly string[]).includes(entityType)) return fail(GENERIC)
    const ids = (normIds ?? []).filter((x) => isUuid(x))
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { error } = await (await createClient()).rpc("set_entity_norms", {
      p_org: user.organization.id, p_entity_type: entityType, p_entity_id: entityId, p_norm_ids: ids,
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app", "layout")
    return ok(undefined)
  })
}

const ND = [0, 2, 6, 10] as const
const NE = [1, 2, 3, 4] as const
const NC = [10, 25, 60, 100] as const
const hazardSchema = z.object({
  processId: z.uuid().nullish(),
  area: z.string().trim().max(200).optional(),
  hazard: z.string().trim().min(3).max(1000),
  classification: z.enum(["fisico", "quimico", "biologico", "biomecanico", "psicosocial", "seguridad", "natural"]),
  controls: z.string().trim().max(2000).optional(),
  nd: z.number().refine((n) => (ND as readonly number[]).includes(n), "ND"),
  ne: z.number().refine((n) => (NE as readonly number[]).includes(n), "NE"),
  nc: z.number().refine((n) => (NC as readonly number[]).includes(n), "NC"),
  intervention: z.string().trim().max(2000).optional(),
  responsibleId: z.uuid().nullish(),
  nextReview: isoDate.nullish(),
})

export async function createHazard(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = hazardSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos y la valoración GTC-45 del peligro.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_hazard", {
      p_org: user.organization.id, p_process: (p.data.processId ?? null) as unknown as string,
      p_area: p.data.area ?? "", p_hazard: p.data.hazard, p_classification: p.data.classification,
      p_controls: p.data.controls ?? "", p_nd: p.data.nd, p_ne: p.data.ne, p_nc: p.data.nc,
      p_intervention: p.data.intervention ?? "", p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_next_review: (p.data.nextReview ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateHazards()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateHazard(hazardId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(hazardId)) return fail(GENERIC)
    const p = hazardSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos y la valoración GTC-45 del peligro.")
    const { error } = await (await createClient()).rpc("update_hazard", {
      p_hazard: hazardId, p_process: (p.data.processId ?? null) as unknown as string,
      p_area: p.data.area ?? "", p_hazard_text: p.data.hazard, p_classification: p.data.classification,
      p_controls: p.data.controls ?? "", p_nd: p.data.nd, p_ne: p.data.ne, p_nc: p.data.nc,
      p_intervention: p.data.intervention ?? "", p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_next_review: (p.data.nextReview ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateHazards()
    return ok(undefined)
  })
}

export async function setHazardActive(hazardId: string, active: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(hazardId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_hazard_active", { p_hazard: hazardId, p_active: active })
    if (error) return fail(dbMessage(error))
    revalidateHazards()
    return ok(undefined)
  })
}

export async function exportHazardsCsv(): Promise<string> {
  const rows = await listHazards()
  const CLS: Record<string, string> = { fisico: "Físico", quimico: "Químico", biologico: "Biológico", biomecanico: "Biomecánico", psicosocial: "Psicosocial", seguridad: "Condiciones de seguridad", natural: "Fenómenos naturales" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Peligro", value: (r) => r.hazard },
    { header: "Clasificación", value: (r) => CLS[r.classification] ?? r.classification },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Área/Cargo", value: (r) => r.area },
    { header: "NR", value: (r) => String(r.nr) },
    { header: "Nivel", value: (r) => `Nivel ${r.riskLevel}` },
    { header: "Estado", value: (r) => (r.status === "inactivo" ? "Inactivo" : "Activo") },
  ])
}

// ---------- Aspectos ambientales (v1.1-4b, ISO 14001) ----------

function revalidateEnv() {
  revalidatePath("/app/aspectos-ambientales", "layout")
  revalidatePath("/app")
}

const CRIT = z.number().int().min(1).max(3)
const aspectSchema = z.object({
  processId: z.uuid().nullish(),
  activity: z.string().trim().min(2).max(500),
  aspect: z.string().trim().min(2).max(500),
  impact: z.string().trim().min(2).max(500),
  condition: z.enum(["normal", "anormal", "emergencia"]),
  controls: z.string().trim().max(2000).optional(),
  legalRequirementId: z.uuid().nullish(),
  responsibleId: z.uuid().nullish(),
  freq: CRIT,
  sev: CRIT,
  reach: CRIT,
  legalCrit: CRIT,
  nextReview: isoDate.nullish(),
})

export async function createAspect(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = aspectSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos y la valoración del aspecto.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_aspect", {
      p_org: user.organization.id, p_process: (p.data.processId ?? null) as unknown as string,
      p_activity: p.data.activity, p_aspect: p.data.aspect, p_impact: p.data.impact, p_condition: p.data.condition,
      p_controls: p.data.controls ?? "", p_legal: (p.data.legalRequirementId ?? null) as unknown as string,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_freq: p.data.freq, p_sev: p.data.sev, p_reach: p.data.reach, p_legal_crit: p.data.legalCrit,
      p_next_review: (p.data.nextReview ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateEnv()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateAspect(aspectId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(aspectId)) return fail(GENERIC)
    const p = aspectSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos y la valoración del aspecto.")
    const { error } = await (await createClient()).rpc("update_aspect", {
      p_aspect: aspectId, p_process: (p.data.processId ?? null) as unknown as string,
      p_activity: p.data.activity, p_aspect_text: p.data.aspect, p_impact: p.data.impact, p_condition: p.data.condition,
      p_controls: p.data.controls ?? "", p_legal: (p.data.legalRequirementId ?? null) as unknown as string,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_freq: p.data.freq, p_sev: p.data.sev, p_reach: p.data.reach, p_legal_crit: p.data.legalCrit,
      p_next_review: (p.data.nextReview ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateEnv()
    return ok(undefined)
  })
}

export async function setAspectActive(aspectId: string, active: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(aspectId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_aspect_active", { p_aspect: aspectId, p_active: active })
    if (error) return fail(dbMessage(error))
    revalidateEnv()
    return ok(undefined)
  })
}

export async function exportEnvCsv(): Promise<string> {
  const rows = await listEnvAspects()
  const COND: Record<string, string> = { normal: "Normal", anormal: "Anormal", emergencia: "Emergencia" }
  const SIG: Record<string, string> = { significativo: "Significativo", no_significativo: "No significativo" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Aspecto", value: (r) => r.aspect },
    { header: "Impacto", value: (r) => r.impact },
    { header: "Condición", value: (r) => COND[r.condition] ?? r.condition },
    { header: "Proceso", value: (r) => r.processName },
    { header: "Índice", value: (r) => String(r.score) },
    { header: "Significancia", value: (r) => SIG[r.significance] ?? r.significance },
    { header: "Estado", value: (r) => (r.status === "inactivo" ? "Inactivo" : "Activo") },
  ])
}

// ---------- Formularios (v1.1-5, constructor) ----------

function revalidateForms() {
  revalidatePath("/app/formularios", "layout")
  revalidatePath("/app")
}

const FIELD_TYPE = z.enum([
  "texto", "texto_largo", "numero", "fecha", "si_no",
  "seleccion", "multiseleccion", "puntaje", "seccion",
])

const templateDataSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.enum(["inspeccion", "lista_verificacion", "formato", "encuesta_interna", "otro"]),
  processId: z.uuid().nullish(),
  description: z.string().trim().max(2000).optional(),
})

const fieldEditSchema = z.object({
  label: z.string().trim().min(1).max(300),
  help: z.string().trim().max(1000).optional(),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  config: z.object({ min: z.number().finite().optional(), max: z.number().finite().optional() }).nullish(),
})

const valuesSchema = z.record(z.string(), z.unknown())

export async function createTemplate(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = templateDataSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la plantilla.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_template", {
      p_org: user.organization.id,
      p_title: p.data.title,
      p_category: p.data.category,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateTemplateData(templateId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const p = templateDataSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la plantilla.")
    const { error } = await (await createClient()).rpc("update_template_data", {
      p_template: templateId,
      p_title: p.data.title,
      p_category: p.data.category,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function addField(templateId: string, type: unknown, label?: string): Promise<Result<{ id: string }>> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const t = FIELD_TYPE.safeParse(type)
    if (!t.success) return fail("Tipo de campo no válido.")
    const { data, error } = await (await createClient()).rpc("add_field", {
      p_template: templateId, p_type: t.data, p_label: (label ?? "").slice(0, 300),
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function updateField(fieldId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(fieldId)) return fail(GENERIC)
    const p = fieldEditSchema.safeParse(input)
    if (!p.success) return fail("Revisa la configuración del campo.")
    const { error } = await (await createClient()).rpc("update_field", {
      p_field: fieldId,
      p_label: p.data.label,
      p_help: p.data.help ?? "",
      p_required: p.data.required,
      p_options: (p.data.options ?? null) as unknown as Json,
      p_config: (p.data.config ?? null) as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function removeField(fieldId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(fieldId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("remove_field", { p_field: fieldId })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function setFieldOrder(templateId: string, fieldIds: string[]): Promise<Result> {
  return guard(async () => {
    if (!isUuid(templateId) || !Array.isArray(fieldIds) || fieldIds.some((id) => !isUuid(id))) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_field_order", {
      p_template: templateId, p_field_ids: fieldIds,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function publishTemplate(templateId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("publish_template", { p_template: templateId })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function newTemplateVersion(templateId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("new_template_version", { p_template: templateId })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function setTemplateArchived(templateId: string, archived: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_template_archived", {
      p_template: templateId, p_archived: archived,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function saveSubmissionDraft(
  submissionId: string | null,
  templateId: string,
  values: unknown,
): Promise<Result<{ id: string }>> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    if (submissionId !== null && !isUuid(submissionId)) return fail(GENERIC)
    const v = valuesSchema.safeParse(values)
    if (!v.success) return fail("No pudimos guardar el borrador.")
    const { data, error } = await (await createClient()).rpc("save_submission_draft", {
      p_submission: (submissionId ?? null) as unknown as string,
      p_template: templateId,
      p_values: v.data as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function submitSubmission(submissionId: string, values: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(submissionId)) return fail(GENERIC)
    const v = valuesSchema.safeParse(values)
    if (!v.success) return fail("Revisa los datos antes de enviar.")
    const { error } = await (await createClient()).rpc("submit_submission", {
      p_submission: submissionId, p_values: v.data as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok(undefined)
  })
}

export async function submitNewSubmission(templateId: string, values: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const v = valuesSchema.safeParse(values)
    if (!v.success) return fail("Revisa los datos antes de enviar.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const promoted = await promoteImageValues(user.organization.id, templateId, v.data)
    const { data, error } = await (await createClient()).rpc("submit_new_submission", {
      p_template: templateId, p_values: promoted as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateForms()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

const FORM_CSV_BOOL = (v: FieldValue): string =>
  typeof v === "boolean" ? (v ? "Sí" : "No") : v === "si" || v === "sí" ? "Sí" : v === "no" ? "No" : ""

function csvValue(value: FieldValue, type: string): string {
  if (value === null || value === undefined) return ""
  if (type === "si_no") return FORM_CSV_BOOL(value)
  if (type === "imagen" && Array.isArray(value)) return value.length ? `${value.length} foto(s)` : ""
  if (type === "multiseleccion" && Array.isArray(value)) return value.join("; ")
  if (Array.isArray(value)) return value.join("; ")
  return String(value)
}

export async function exportFormCsv(code: string): Promise<string> {
  const template = await getFormTemplate(code)
  if (!template) return ""
  const columns = template.fields.filter((f) => f.type !== "seccion")
  const rows = await listSubmissionsForExport(template.id)
  type Row = (typeof rows)[number]
  return toCsv<Row>(rows, [
    { header: "Fecha", value: (r) => (r.submittedAt ? formatDateTime(r.submittedAt) : "") },
    { header: "Diligenció", value: (r) => r.submittedByName },
    { header: "Versión", value: (r) => String(r.templateVersion) },
    ...columns.map((c) => ({
      header: c.label,
      value: (r: Row) => csvValue(r.values[c.id] ?? null, c.type),
    })),
  ])
}

/** Carga una respuesta para verla (lectura); la RLS valida acceso del rol SIG. */
export async function fetchSubmission(id: string): Promise<SubmissionDetail | null> {
  if (!isUuid(id)) return null
  return getSubmission(id)
}

// ---------- SG-SST: Estándares Mínimos (Res. 0312) (v1.2-2) ----------

function revalidateSst() {
  revalidatePath("/app/sg-sst", "layout")
  revalidatePath("/app")
}

const evaluationSchema = z.object({
  period: z.number().int().min(2019).max(2100),
  workers: z.number().int().min(1).max(1000000),
  risk: z.number().int().min(1).max(5),
})

export async function createEvaluation(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = evaluationSchema.safeParse(input)
    if (!p.success) return fail("Revisa el período, el número de trabajadores y la clase de riesgo.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_evaluation", {
      p_org: user.organization.id, p_period: p.data.period, p_workers: p.data.workers, p_risk: p.data.risk,
    })
    if (error) return fail(dbMessage(error))
    revalidateSst()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function setItemStatus(itemId: string, status: string, justification?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(itemId)) return fail(GENERIC)
    if (!["pendiente", "cumple", "no_cumple", "no_aplica"].includes(status)) return fail("Estado no válido.")
    const { error } = await (await createClient()).rpc("set_item_status", {
      p_item: itemId, p_status: status, p_justification: justification ?? undefined,
    })
    if (error) return fail(dbMessage(error))
    revalidateSst()
    return ok(undefined)
  })
}

export async function closeEvaluation(evaluationId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(evaluationId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_evaluation", { p_eval: evaluationId })
    if (error) return fail(dbMessage(error))
    revalidateSst()
    return ok(undefined)
  })
}

const sstActionSchema = z.object({
  evaluationId: z.uuid(),
  standardId: z.uuid(),
  description: z.string().trim().min(3).max(1000),
  responsibleId: z.uuid().nullish(),
  dueDate: isoDate.nullish(),
})

export async function addSstAction(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = sstActionSchema.safeParse(input)
    if (!p.success) return fail("Completa la descripción de la acción de mejora.")
    const { data, error } = await (await createClient()).rpc("add_sst_action", {
      p_eval: p.data.evaluationId, p_standard: p.data.standardId, p_description: p.data.description,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
      p_due: (p.data.dueDate ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateSst()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function setSstActionStatus(actionId: string, status: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(actionId)) return fail(GENERIC)
    if (!["pendiente", "en_curso", "hecha", "cancelada"].includes(status)) return fail("Estado no válido.")
    const { error } = await (await createClient()).rpc("set_sst_action_status", { p_action: actionId, p_status: status })
    if (error) return fail(dbMessage(error))
    revalidateSst()
    return ok(undefined)
  })
}

const SST_CYCLE_LABEL: Record<string, string> = { planear: "Planear", hacer: "Hacer", verificar: "Verificar", actuar: "Actuar" }
const SST_ITEM_LABEL: Record<string, string> = { pendiente: "Pendiente", cumple: "Cumple", no_cumple: "No cumple", no_aplica: "No aplica" }

export async function exportSstCsv(code: string): Promise<string> {
  const e = await getSstEvaluation(code)
  if (!e) return ""
  return toCsv(e.items, [
    { header: "Código", value: (i) => i.code },
    { header: "Estándar", value: (i) => i.name },
    { header: "Ciclo", value: (i) => SST_CYCLE_LABEL[i.cycle] ?? i.cycle },
    { header: "Peso", value: (i) => String(i.weight) },
    { header: "Aplica al nivel", value: (i) => (i.applicable ? "Sí" : "No") },
    { header: "Estado", value: (i) => SST_ITEM_LABEL[i.status] ?? i.status },
    { header: "Justificación", value: (i) => i.justification ?? "" },
  ])
}

// ---------- Metrología (7.1.5) (v1.2-3) ----------

function revalidateMetrology() {
  revalidatePath("/app/metrologia", "layout")
  revalidatePath("/app")
}

const MET_FREQUENCY = z.enum(["mensual", "bimestral", "trimestral", "semestral", "anual", "bienal"])
const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(200),
  type: z.string().trim().max(100).optional(),
  processId: z.uuid().nullish(),
  location: z.string().trim().max(200).optional(),
  range: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(40).optional(),
  frequency: MET_FREQUENCY,
  responsibleId: z.uuid().nullish(),
})

export async function createEquipment(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = equipmentSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del equipo.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_equipment", {
      p_org: user.organization.id, p_name: p.data.name, p_type: p.data.type ?? "",
      p_process: (p.data.processId ?? null) as unknown as string, p_location: p.data.location ?? "",
      p_range: p.data.range ?? "", p_unit: p.data.unit ?? "", p_frequency: p.data.frequency,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateMetrology()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateEquipment(equipmentId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(equipmentId)) return fail(GENERIC)
    const p = equipmentSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del equipo.")
    const { error } = await (await createClient()).rpc("update_equipment", {
      p_equipment: equipmentId, p_name: p.data.name, p_type: p.data.type ?? "",
      p_process: (p.data.processId ?? null) as unknown as string, p_location: p.data.location ?? "",
      p_range: p.data.range ?? "", p_unit: p.data.unit ?? "", p_frequency: p.data.frequency,
      p_responsible: (p.data.responsibleId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateMetrology()
    return ok(undefined)
  })
}

export async function setEquipmentService(equipmentId: string, inService: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(equipmentId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_equipment_service", { p_equipment: equipmentId, p_in_service: inService })
    if (error) return fail(dbMessage(error))
    revalidateMetrology()
    return ok(undefined)
  })
}

const calibrationSchema = z.object({
  date: isoDate,
  kind: z.enum(["calibracion", "verificacion"]),
  result: z.enum(["conforme", "no_conforme", "ajustado"]),
  standard: z.string().trim().max(200).optional(),
  certificate: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
})

export async function registerCalibration(equipmentId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(equipmentId)) return fail(GENERIC)
    const p = calibrationSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la calibración.")
    const { error } = await (await createClient()).rpc("register_calibration", {
      p_equipment: equipmentId, p_date: p.data.date, p_kind: p.data.kind, p_result: p.data.result,
      p_standard: p.data.standard ?? "", p_certificate: p.data.certificate ?? "", p_provider: p.data.provider ?? "", p_note: p.data.note ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateMetrology()
    return ok(undefined)
  })
}

const CAL_KIND: Record<string, string> = { calibracion: "Calibración", verificacion: "Verificación" }
const CAL_RESULT: Record<string, string> = { conforme: "Conforme", no_conforme: "No conforme", ajustado: "Ajustado" }

export async function exportCalibrationsCsv(code: string): Promise<string> {
  const e = await getEquipment(code)
  if (!e) return ""
  return toCsv(e.calibrations, [
    { header: "Fecha", value: (c) => c.date },
    { header: "Tipo", value: (c) => CAL_KIND[c.kind] ?? c.kind },
    { header: "Resultado", value: (c) => CAL_RESULT[c.result] ?? c.result },
    { header: "Patrón", value: (c) => c.standardUsed ?? "" },
    { header: "Certificado", value: (c) => c.certificateRef ?? "" },
    { header: "Proveedor", value: (c) => c.provider ?? "" },
    { header: "Próxima", value: (c) => c.nextDueDate ?? "" },
  ])
}

// ---------- Gestión del cambio (6.3) (v1.2-3) ----------

function revalidateChanges() {
  revalidatePath("/app/cambios", "layout")
  revalidatePath("/app")
}

const CHANGE_TYPE = z.enum(["proceso", "documento", "infraestructura", "tecnologico", "organizacional", "otro"])
const changeSchema = z.object({
  title: z.string().trim().min(3).max(200),
  changeType: CHANGE_TYPE,
  processId: z.uuid().nullish(),
  description: z.string().trim().max(2000).optional(),
  requestedById: z.uuid().nullish(),
})

export async function createChange(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = changeSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la solicitud.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_change", {
      p_org: user.organization.id, p_title: p.data.title, p_type: p.data.changeType,
      p_process: (p.data.processId ?? null) as unknown as string, p_description: p.data.description ?? "",
      p_requested_by: (p.data.requestedById ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateChanges()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateChange(changeId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(changeId)) return fail(GENERIC)
    const p = changeSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la solicitud.")
    const { error } = await (await createClient()).rpc("update_change", {
      p_change: changeId, p_title: p.data.title, p_type: p.data.changeType,
      p_process: (p.data.processId ?? null) as unknown as string, p_description: p.data.description ?? "",
      p_requested_by: (p.data.requestedById ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateChanges()
    return ok(undefined)
  })
}

export async function assessChange(changeId: string, impact: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(changeId)) return fail(GENERIC)
    if (impact.trim().length < 3) return fail("Describe el análisis de impacto.")
    const { error } = await (await createClient()).rpc("assess_change", { p_change: changeId, p_impact: impact })
    if (error) return fail(dbMessage(error))
    revalidateChanges()
    return ok(undefined)
  })
}

export async function decideChange(changeId: string, approve: boolean, approverId?: string | null): Promise<Result> {
  return guard(async () => {
    if (!isUuid(changeId)) return fail(GENERIC)
    if (approverId && !isUuid(approverId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("decide_change", {
      p_change: changeId, p_approve: approve, p_approver: (approverId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateChanges()
    return ok(undefined)
  })
}

export async function implementChange(changeId: string, notes?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(changeId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("implement_change", { p_change: changeId, p_notes: notes ?? "" })
    if (error) return fail(dbMessage(error))
    revalidateChanges()
    return ok(undefined)
  })
}

// ---------- Capacitación / LMS (ISO 7.2) (v1.2-4b) ----------

function revalidateCourses() {
  revalidatePath("/app/capacitacion", "layout")
}

const courseDataSchema = z.object({
  title: z.string().trim().min(3).max(200),
  processId: z.uuid().nullish(),
  description: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(20000).optional(),
  passingScore: z.number().int().min(0).max(100),
})

const questionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  options: z
    .array(z.object({ text: z.string().trim().min(1).max(300), correct: z.boolean() }))
    .min(2)
    .max(10)
    .refine((opts) => opts.filter((o) => o.correct).length === 1, {
      message: "Marca exactamente una opción correcta.",
    }),
})

const attemptSchema = z.record(z.string(), z.number().int().min(0).max(50))

export async function createCourse(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = courseDataSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del curso.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_course", {
      p_org: user.organization.id,
      p_title: p.data.title,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_description: p.data.description ?? "",
      p_passing: p.data.passingScore,
    })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateCourseData(courseId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(courseId)) return fail(GENERIC)
    const p = courseDataSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del curso.")
    const { error } = await (await createClient()).rpc("update_course_data", {
      p_course: courseId,
      p_title: p.data.title,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_description: p.data.description ?? "",
      p_content: p.data.content ?? "",
      p_passing: p.data.passingScore,
    })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok(undefined)
  })
}

export async function addCourseQuestion(courseId: string, input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    if (!isUuid(courseId)) return fail(GENERIC)
    const p = questionSchema.safeParse(input)
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Revisa la pregunta.")
    const { data, error } = await (await createClient()).rpc("add_course_question", {
      p_course: courseId, p_text: p.data.text, p_options: p.data.options as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function updateCourseQuestion(questionId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(questionId)) return fail(GENERIC)
    const p = questionSchema.safeParse(input)
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Revisa la pregunta.")
    const { error } = await (await createClient()).rpc("update_course_question", {
      p_question: questionId, p_text: p.data.text, p_options: p.data.options as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok(undefined)
  })
}

export async function removeCourseQuestion(questionId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(questionId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("remove_course_question", { p_question: questionId })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok(undefined)
  })
}

export async function publishCourse(courseId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(courseId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("publish_course", { p_course: courseId })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok(undefined)
  })
}

export async function setCourseArchived(courseId: string, archived: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(courseId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_course_archived", {
      p_course: courseId, p_archived: archived,
    })
    if (error) return fail(dbMessage(error))
    revalidateCourses()
    return ok(undefined)
  })
}

/** Envía un intento; el servidor califica (sin confiar en el cliente) y devuelve el resultado. */
export async function submitCourseAttempt(courseId: string, answers: unknown): Promise<Result<CourseAttemptResult>> {
  return guard(async () => {
    if (!isUuid(courseId)) return fail(GENERIC)
    const a = attemptSchema.safeParse(answers)
    if (!a.success) return fail("Responde todas las preguntas antes de enviar.")
    const { data, error } = await (await createClient()).rpc("submit_course_attempt", {
      p_course: courseId, p_answers: a.data as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    const d = data as { score: number; status: "aprobado" | "no_aprobado"; passingScore: number }
    revalidateCourses()
    return ok({ score: Number(d.score), status: d.status, passingScore: Number(d.passingScore) })
  })
}

export async function exportCourseResultsCsv(code: string): Promise<string> {
  const course = await getCourse(code)
  if (!course) return ""
  type Row = (typeof course.enrollments)[number]
  return toCsv<Row>(course.enrollments, [
    { header: "Persona", value: (r) => r.userName },
    { header: "Fecha", value: (r) => (r.completedAt ? formatDateTime(r.completedAt) : "") },
    { header: "Puntaje", value: (r) => String(r.score) },
    { header: "Resultado", value: (r) => (r.status === "aprobado" ? "Aprobado" : "No aprobado") },
  ])
}

// ---------- Contexto de la organización (ISO 4.1/4.2) (v1.3-1) ----------

function revalidateContext() {
  revalidatePath("/app/contexto", "layout")
}

const SWOT = z.enum(["fortaleza", "debilidad", "oportunidad", "amenaza"])
const PESTEL = z.enum(["politico", "economico", "social", "tecnologico", "ecologico", "legal"])
const PARTY_TYPE = z.enum(["cliente", "proveedor", "empleado", "accionista", "autoridad", "comunidad", "otro"])

const issueSchema = z.object({
  swot: SWOT,
  pestel: PESTEL.nullish(),
  description: z.string().trim().min(3).max(2000),
  implication: z.string().trim().max(2000).optional(),
  processId: z.uuid().nullish(),
  objectiveId: z.uuid().nullish(),
})

const partySchema = z.object({
  name: z.string().trim().min(2).max(200),
  partyType: PARTY_TYPE,
  needsExpectations: z.string().trim().max(2000).optional(),
  requirements: z.string().trim().max(2000).optional(),
  monitoring: z.string().trim().max(2000).optional(),
  processId: z.uuid().nullish(),
  legalRequirementId: z.uuid().nullish(),
})

const genRiskSchema = z.object({
  processId: z.uuid(),
  ownerPositionId: z.uuid(),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
})

export async function createContextIssue(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = issueSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la cuestión.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_context_issue", {
      p_org: user.organization.id,
      p_swot: p.data.swot,
      p_pestel: (p.data.pestel ?? null) as unknown as string,
      p_description: p.data.description,
      p_implication: p.data.implication ?? "",
      p_process: (p.data.processId ?? null) as unknown as string,
      p_objective: (p.data.objectiveId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function updateContextIssue(issueId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(issueId)) return fail(GENERIC)
    const p = issueSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la cuestión.")
    const { error } = await (await createClient()).rpc("update_context_issue", {
      p_issue: issueId,
      p_swot: p.data.swot,
      p_pestel: (p.data.pestel ?? null) as unknown as string,
      p_description: p.data.description,
      p_implication: p.data.implication ?? "",
      p_process: (p.data.processId ?? null) as unknown as string,
      p_objective: (p.data.objectiveId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok(undefined)
  })
}

export async function setIssueArchived(issueId: string, archived: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(issueId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_issue_archived", { p_issue: issueId, p_archived: archived })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok(undefined)
  })
}

export async function generateRiskFromIssue(issueId: string, input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(issueId)) return fail(GENERIC)
    const p = genRiskSchema.safeParse(input)
    if (!p.success) return fail("Elige el proceso y el responsable del riesgo.")
    const { data, error } = await (await createClient()).rpc("generate_risk_from_issue", {
      p_issue: issueId,
      p_process: p.data.processId,
      p_owner: p.data.ownerPositionId,
      p_probability: p.data.probability,
      p_impact: p.data.impact,
    })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function createInterestedParty(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = partySchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la parte interesada.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_interested_party", {
      p_org: user.organization.id,
      p_name: p.data.name,
      p_type: p.data.partyType,
      p_needs: p.data.needsExpectations ?? "",
      p_requirements: p.data.requirements ?? "",
      p_monitoring: p.data.monitoring ?? "",
      p_process: (p.data.processId ?? null) as unknown as string,
      p_legal: (p.data.legalRequirementId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok({ id: (data as unknown as string) ?? "" })
  })
}

export async function updateInterestedParty(partyId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(partyId)) return fail(GENERIC)
    const p = partySchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la parte interesada.")
    const { error } = await (await createClient()).rpc("update_interested_party", {
      p_party: partyId,
      p_name: p.data.name,
      p_type: p.data.partyType,
      p_needs: p.data.needsExpectations ?? "",
      p_requirements: p.data.requirements ?? "",
      p_monitoring: p.data.monitoring ?? "",
      p_process: (p.data.processId ?? null) as unknown as string,
      p_legal: (p.data.legalRequirementId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok(undefined)
  })
}

export async function setPartyArchived(partyId: string, archived: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(partyId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_party_archived", { p_party: partyId, p_archived: archived })
    if (error) return fail(dbMessage(error))
    revalidateContext()
    return ok(undefined)
  })
}

export async function exportContextIssuesCsv(): Promise<string> {
  const issues = await listContextIssues()
  type Row = (typeof issues)[number]
  return toCsv<Row>(issues, [
    { header: "Tipo DOFA", value: (r) => r.swot },
    { header: "PESTEL", value: (r) => r.pestel ?? "" },
    { header: "Cuestión", value: (r) => r.description },
    { header: "Implicación", value: (r) => r.implication ?? "" },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Riesgo", value: (r) => r.riskCode ?? "" },
    { header: "Objetivo", value: (r) => r.objectiveCode ?? "" },
    { header: "Estado", value: (r) => r.status },
  ])
}

export async function exportInterestedPartiesCsv(): Promise<string> {
  const parties = await listInterestedParties()
  type Row = (typeof parties)[number]
  return toCsv<Row>(parties, [
    { header: "Parte", value: (r) => r.name },
    { header: "Tipo", value: (r) => r.partyType },
    { header: "Necesidades/expectativas", value: (r) => r.needsExpectations ?? "" },
    { header: "Requisitos", value: (r) => r.requirements ?? "" },
    { header: "Seguimiento", value: (r) => r.monitoring ?? "" },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Requisito legal", value: (r) => r.legalRequirementCode ?? "" },
    { header: "Estado", value: (r) => r.status },
  ])
}

// ---------- Caracterización de procesos (ISO 4.4) (v1.3-2) ----------

const characterizationSchema = z.object({
  objective: z.string().trim().max(2000).optional(),
  scope: z.string().trim().max(2000).optional(),
  inputs: z.string().trim().max(2000).optional(),
  suppliers: z.string().trim().max(1000).optional(),
  outputs: z.string().trim().max(2000).optional(),
  clients: z.string().trim().max(1000).optional(),
  resources: z.string().trim().max(2000).optional(),
  phvaPlan: z.string().trim().max(1000).optional(),
  phvaDo: z.string().trim().max(1000).optional(),
  phvaCheck: z.string().trim().max(1000).optional(),
  phvaAct: z.string().trim().max(1000).optional(),
})

export async function updateProcessCharacterization(processId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(processId)) return fail(GENERIC)
    const p = characterizationSchema.safeParse(input)
    if (!p.success) return fail("Revisa la caracterización.")
    const { error } = await (await createClient()).rpc("update_process_characterization", {
      p_process: processId,
      p_objective: p.data.objective ?? "",
      p_scope: p.data.scope ?? "",
      p_inputs: p.data.inputs ?? "",
      p_suppliers: p.data.suppliers ?? "",
      p_outputs: p.data.outputs ?? "",
      p_clients: p.data.clients ?? "",
      p_resources: p.data.resources ?? "",
      p_phva_plan: p.data.phvaPlan ?? "",
      p_phva_do: p.data.phvaDo ?? "",
      p_phva_check: p.data.phvaCheck ?? "",
      p_phva_act: p.data.phvaAct ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/procesos", "layout")
    return ok(undefined)
  })
}

export async function exportProcessesCsv(): Promise<string> {
  const { items } = await getProcessMap()
  type Row = (typeof items)[number]
  return toCsv<Row>(items, [
    { header: "Código", value: (r) => r.code },
    { header: "Proceso", value: (r) => r.name },
    { header: "Tipo", value: (r) => r.type },
    { header: "Líder", value: (r) => r.leaderName ?? "" },
    { header: "Caracterizado", value: (r) => (r.characterized ? "Sí" : "No") },
  ])
}

// ---------- Tablero configurable (v1.3-3b) ----------

const BLOCK_KEYS = [
  "kpi_mejora", "kpi_desempeno", "kpi_cliente", "kpi_documentos",
  "panel_nc", "panel_indicadores", "panel_objetivos", "panel_pqrs",
] as const
const layoutSchema = z.array(z.object({ key: z.enum(BLOCK_KEYS), visible: z.boolean() })).max(16)

export async function setDashboardLayout(blocks: unknown): Promise<Result> {
  return guard(async () => {
    const p = layoutSchema.safeParse(blocks)
    if (!p.success) return fail("Configuración del tablero no válida.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const stored = toStoredLayout(p.data)
    const { error } = await (await createClient()).rpc("set_dashboard_layout", {
      p_org: user.organization.id,
      p_layout: stored as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/tablero", "layout")
    return ok(undefined)
  })
}

// ---------- Fotos de formularios / inspecciones (v1.3-4) ----------

const PHOTO_EXT = new Set(["jpg", "jpeg", "png", "webp"])
const isPhotoExt = (ext: string) => PHOTO_EXT.has(ext)
const photoBase = (org: string, templateId: string) => `${org}/${templateId}`

/** Emite tickets de subida (zona temporal) para fotos de un formulario publicado. */
export async function prepareFormPhotos(templateId: string, exts: unknown): Promise<Result<UploadTicket[]>> {
  return guard(async () => {
    if (!isUuid(templateId)) return fail(GENERIC)
    const list = z.array(z.enum(["jpg", "jpeg", "png", "webp"])).min(1).max(10).safeParse(exts)
    if (!list.success) return fail("Formato de imagen no admitido.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data: t } = await (await createClient())
      .from("form_templates").select("id, organization_id, status").eq("id", templateId).maybeSingle()
    if (!t || t.organization_id !== user.organization.id) return fail("Formulario no disponible.")
    if (t.status !== "publicado") return fail("Este formulario no está disponible para diligenciar.")
    const base = photoBase(user.organization.id, templateId)
    const tickets: UploadTicket[] = []
    for (const ext of list.data) {
      const name = `${crypto.randomUUID()}.${ext}`
      tickets.push(await createUploadTicket("form-photos", stagingPath(base, name)))
    }
    return ok(tickets)
  })
}

/** Promueve a su ruta final las fotos (rutas temporales bajo <org>/<template>/subida/) que vengan
 *  en los valores; valida tamaño y firma binaria. Devuelve los valores con las rutas finales. */
async function promoteImageValues(
  org: string, templateId: string, values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = photoBase(org, templateId)
  const stagingPrefix = `${base}/${"subida"}/`
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value) && value.some((x) => typeof x === "string" && x.startsWith(stagingPrefix))) {
      const promoted: unknown[] = []
      for (const el of value) {
        if (typeof el === "string" && el.startsWith(stagingPrefix)) {
          const vf = await promoteUpload("form-photos", base, el, isPhotoExt)
          promoted.push(vf.path)
        } else {
          promoted.push(el)
        }
      }
      out[key] = promoted
    } else {
      out[key] = value
    }
  }
  return out
}

/** URLs firmadas cortas para ver las fotos de una respuesta (la RLS del bucket autoriza). */
export async function getFormPhotoUrls(paths: unknown): Promise<Record<string, string>> {
  const list = z.array(z.string().max(300)).max(60).safeParse(paths)
  if (!list.success) return {}
  const supabase = await createClient()
  const out: Record<string, string> = {}
  for (const path of [...new Set(list.data)]) {
    const { data } = await supabase.storage.from("form-photos").createSignedUrl(path, 600)
    if (data?.signedUrl) out[path] = data.signedUrl
  }
  return out
}

// ---------- Salida no conforme (ISO 8.7) (v1.3-5a) ----------

function revalidateNcOutputs() {
  revalidatePath("/app/salidas-no-conformes", "layout")
}

const DISPOSITION = z.enum(["separar", "reproceso", "reclasificar", "concesion", "devolucion", "desecho", "suspender_servicio"])

const ncOutputSchema = z.object({
  description: z.string().trim().min(3).max(2000),
  processId: z.uuid().nullish(),
  detectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  identification: z.string().trim().max(1000).optional(),
})

const dispositionSchema = z.object({
  disposition: DISPOSITION,
  detail: z.string().trim().max(2000).optional(),
  customerInformed: z.boolean().optional(),
  responsiblePositionId: z.uuid().nullish(),
})

export async function createNcOutput(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = ncOutputSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la salida.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_nc_output", {
      p_org: user.organization.id,
      p_description: p.data.description,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_detected: (p.data.detectedDate ?? null) as unknown as string,
      p_identification: p.data.identification ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    after(() => deliverChat().catch((e) => console.error("chat", e)))
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateNcOutput(outputId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const p = ncOutputSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la salida.")
    const { error } = await (await createClient()).rpc("update_nc_output", {
      p_output: outputId,
      p_description: p.data.description,
      p_process: (p.data.processId ?? null) as unknown as string,
      p_detected: (p.data.detectedDate ?? null) as unknown as string,
      p_identification: p.data.identification ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    return ok(undefined)
  })
}

export async function setOutputDisposition(outputId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const p = dispositionSchema.safeParse(input)
    if (!p.success) return fail("Elige la disposición.")
    const { error } = await (await createClient()).rpc("set_output_disposition", {
      p_output: outputId,
      p_disposition: p.data.disposition,
      p_detail: p.data.detail ?? "",
      p_customer_informed: p.data.customerInformed ?? false,
      p_responsible: (p.data.responsiblePositionId ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    return ok(undefined)
  })
}

export async function closeOutput(outputId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_output", { p_output: outputId })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    return ok(undefined)
  })
}

export async function cancelOutput(outputId: string, reason?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("cancel_output", {
      p_output: outputId, p_reason: (reason ?? "").slice(0, 500),
    })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    return ok(undefined)
  })
}

export async function generateNcFromNcOutput(outputId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(outputId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_snc", { p_output: outputId })
    if (error) return fail(dbMessage(error))
    revalidateNcOutputs()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function exportNcOutputsCsv(): Promise<string> {
  const rows = await listNcOutputs()
  type Row = (typeof rows)[number]
  return toCsv<Row>(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Descripción", value: (r) => r.description },
    { header: "Estado", value: (r) => r.status },
    { header: "Disposición", value: (r) => r.disposition ?? "" },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Detectada", value: (r) => r.detectedDate },
    { header: "NC", value: (r) => r.nonconformityCode ?? "" },
  ])
}

// ---------- API pública: claves (v1.3) ----------

const apiKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(["read:nonconformities", "read:indicators", "read:risks", "read:audits", "read:pqrs"])).min(1),
})

export async function createApiKey(input: unknown): Promise<Result<ApiKeyCreated>> {
  return guard(async () => {
    const p = apiKeySchema.safeParse(input)
    if (!p.success) return fail("Revisa el nombre y los permisos.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { token, prefix, hash } = generateApiToken()
    const { error } = await (await createClient()).rpc("create_api_key", {
      p_org: user.organization.id, p_name: p.data.name, p_scopes: p.data.scopes, p_prefix: prefix, p_hash: hash,
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/admin", "layout")
    return ok({ token, keyPrefix: prefix })
  })
}

export async function revokeApiKey(keyId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(keyId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("revoke_api_key", { p_key: keyId })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/admin", "layout")
    return ok(undefined)
  })
}

// ---------- Webhooks (v1.4-1) ----------

const webhookSchema = z.object({
  url: z.string().trim().url().startsWith("https://").max(500),
  events: z.array(z.enum(["nonconformity.created", "indicator.measurement.recorded", "pqrs.created", "nonconforming_output.created"])).min(1),
})

export async function createWebhookEndpoint(input: unknown): Promise<Result<WebhookCreated>> {
  return guard(async () => {
    const p = webhookSchema.safeParse(input)
    if (!p.success) return fail("Revisa la URL (https://) y los eventos.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const secret = `whsec_${randomBytes(24).toString("base64url")}`
    const { error } = await (await createClient()).rpc("create_webhook_endpoint", {
      p_org: user.organization.id, p_url: p.data.url, p_events: p.data.events, p_secret: secret,
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/admin", "layout")
    return ok({ secret })
  })
}

export async function revokeWebhookEndpoint(endpointId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(endpointId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("revoke_webhook_endpoint", { p_endpoint: endpointId })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/admin", "layout")
    return ok(undefined)
  })
}

// ---------- Gestión del conocimiento (ISO 7.1.6) (v1.4-2) ----------

function revalidateKnowledge() {
  revalidatePath("/app/conocimiento", "layout")
}

const CATEGORY = z.enum(["buenas_practicas", "lecciones_aprendidas", "know_how", "faq"])
const articleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: CATEGORY,
  processId: z.uuid().nullish(),
  content: z.string().trim().min(1).max(20000),
  source: z.string().trim().max(500).optional(),
})

export async function createKnowledgeArticle(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = articleSchema.safeParse(input)
    if (!p.success) return fail("Revisa el título, la categoría y el contenido.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_knowledge_article", {
      p_org: user.organization.id, p_title: p.data.title, p_category: p.data.category,
      p_process: (p.data.processId ?? null) as unknown as string, p_content: p.data.content, p_source: p.data.source ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateKnowledge()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateKnowledgeArticle(articleId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(articleId)) return fail(GENERIC)
    const p = articleSchema.safeParse(input)
    if (!p.success) return fail("Revisa el título, la categoría y el contenido.")
    const { error } = await (await createClient()).rpc("update_knowledge_article", {
      p_article: articleId, p_title: p.data.title, p_category: p.data.category,
      p_process: (p.data.processId ?? null) as unknown as string, p_content: p.data.content, p_source: p.data.source ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateKnowledge()
    return ok(undefined)
  })
}

export async function setArticleArchived(articleId: string, archived: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(articleId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_article_archived", { p_article: articleId, p_archived: archived })
    if (error) return fail(dbMessage(error))
    revalidateKnowledge()
    return ok(undefined)
  })
}

export async function createLessonFromNc(ncId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(ncId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("create_article_from_nc", { p_nc: ncId })
    if (error) return fail(dbMessage(error))
    revalidateKnowledge()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function createLessonFromAudit(auditId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(auditId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("create_article_from_audit", { p_audit: auditId })
    if (error) return fail(dbMessage(error))
    revalidateKnowledge()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function exportKnowledgeCsv(): Promise<string> {
  const rows = await listKnowledge()
  type Row = (typeof rows)[number]
  return toCsv<Row>(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Título", value: (r) => r.title },
    { header: "Categoría", value: (r) => r.category },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Origen", value: (r) => r.sourceNcCode ?? r.sourceAuditCode ?? "" },
    { header: "Estado", value: (r) => r.status },
  ])
}

// ---------- Portal externo (v1.4-3) ----------

/**
 * Activa/desactiva el buzón público de PQRS de la organización y, si `regenerate`, rota el
 * enlace (invalida el anterior). El token se genera en el servidor; la autorización (can_manage_pqrs)
 * la hace la RPC. Devuelve el token vigente.
 */
export async function setPublicPqrsPortal(input: { enabled: boolean; regenerate?: boolean }): Promise<Result<{ token: string }>> {
  return guard(async () => {
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const token = input.regenerate ? randomBytes(18).toString("hex") : ""
    const { data, error } = await (await createClient()).rpc("set_public_pqrs_portal", {
      p_org: user.organization.id, p_enabled: !!input.enabled, p_token: token,
    })
    if (error) return fail(dbMessage(error))
    revalidatePqrs()
    return ok({ token: (data as string | null) ?? "" })
  })
}

/** Genera/rota el enlace de autoevaluación de un proveedor. Devuelve el token. */
export async function issueSupplierSelfAssessment(supplierId: string): Promise<Result<{ token: string }>> {
  return guard(async () => {
    if (!isUuid(supplierId)) return fail(GENERIC)
    const token = randomBytes(18).toString("hex")
    const { error } = await (await createClient()).rpc("issue_supplier_self_assessment", { p_supplier: supplierId, p_token: token })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok({ token })
  })
}

/** Marca como revisada una autoevaluación recibida. */
export async function markSelfAssessmentReviewed(assessmentId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(assessmentId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("mark_self_assessment_reviewed", { p_assessment: assessmentId })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok(undefined)
  })
}

/** Radicar PQRS pública (sin sesión): CAPTCHA + rate-limit por IP y (token, IP), luego RPC anónimo. */
export async function submitPublicPqrs(input: {
  token: string
  type: string
  customerName?: string
  customerContact?: string
  description: string
  captchaToken: string
}): Promise<Result> {
  return guard(async () => {
    const token = String(input.token ?? "")
    if (token.length < 16 || token.length > 128) return fail("Este formulario no está disponible.")
    if (!PQRS_TYPES.includes(input.type as (typeof PQRS_TYPES)[number])) return fail("Elige un tipo válido.")
    const description = String(input.description ?? "").trim().slice(0, 4000)
    if (description.length < 3) return fail("Cuéntanos tu caso.")
    const name = (input.customerName ?? "").trim().slice(0, 200)
    const contact = (input.customerContact ?? "").trim().slice(0, 200)
    const ip = await clientIp()
    if (!(await verifyTurnstile(input.captchaToken, "pqrs_publica", ip))) return fail(CAPTCHA_FAILED)
    if (!(await withinLimits([["pqrs_pub:ip", ip], ["pqrs_pub:token_ip", `${token}|${ipKey(ip) ?? "x"}`]]))) return fail(TOO_MANY)
    const { error } = await (await createClient()).rpc("submit_public_pqrs", {
      p_token: token, p_type: input.type, p_customer_name: name || "", p_customer_contact: contact || "", p_description: description,
    })
    if (error) return fail(dbMessage(error, "Este formulario no está disponible."))
    return ok(undefined)
  })
}

/** Autoevaluación de proveedor pública (sin sesión): CAPTCHA + rate-limit, luego RPC anónimo. */
export async function submitSupplierSelfAssessment(input: {
  token: string
  score: number
  comment?: string
  captchaToken: string
}): Promise<Result> {
  return guard(async () => {
    const token = String(input.token ?? "")
    if (token.length < 16 || token.length > 128) return fail("Este formulario no está disponible.")
    if (typeof input.score !== "number" || !Number.isFinite(input.score) || input.score < 0 || input.score > 100) return fail("Indica un puntaje de 0 a 100.")
    const comment = (input.comment ?? "").trim().slice(0, 2000)
    const ip = await clientIp()
    if (!(await verifyTurnstile(input.captchaToken, "proveedor", ip))) return fail(CAPTCHA_FAILED)
    if (!(await withinLimits([["proveedor:ip", ip], ["proveedor:token_ip", `${token}|${ipKey(ip) ?? "x"}`]]))) return fail(TOO_MANY)
    const ipHash = ip ? sha256Hex(`${ip}|${token}`) : null
    const { error } = await (await createClient()).rpc("submit_supplier_self_assessment", {
      p_token: token, p_score: input.score, p_comment: comment || "", p_ip_hash: ipHash ?? "",
    })
    if (error) return fail(dbMessage(error, "Este formulario no está disponible."))
    return ok(undefined)
  })
}

// ---------- Multi-idioma (v1.4-4) ----------

const LOCALES = ["es", "en"] as const

/** Cambia el idioma de interfaz del usuario. */
export async function setUserLocale(locale: string): Promise<Result> {
  return guard(async () => {
    if (!LOCALES.includes(locale as (typeof LOCALES)[number])) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_user_locale", { p_locale: locale })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app", "layout")
    return ok(undefined)
  })
}

/** Guarda la traducción de un campo de una entidad (vacío = sin traducción). v1: documentos. */
export async function setContentTranslation(input: {
  entityType: string
  entityId: string
  locale: string
  field: string
  value: string
}): Promise<Result> {
  return guard(async () => {
    if (!isUuid(input.entityId)) return fail(GENERIC)
    if (!LOCALES.includes(input.locale as (typeof LOCALES)[number])) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_content_translation", {
      p_entity_type: input.entityType, p_entity_id: input.entityId, p_locale: input.locale,
      p_field: input.field, p_value: (input.value ?? "").slice(0, 4000),
    })
    if (error) return fail(dbMessage(error))
    revalidatePath("/app/documentos", "layout")
    return ok(undefined)
  })
}

// ---------- BPM-lite: Solicitudes y aprobaciones (v1.4-5) ----------

function revalidateApprovals() {
  revalidatePath("/app/solicitudes", "layout")
  revalidatePath("/app/admin")
  revalidatePath("/app")
}

const flowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
})

export async function createApprovalFlow(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = flowSchema.safeParse(input)
    if (!p.success) return fail("Revisa el nombre del flujo.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_approval_flow", {
      p_org: user.organization.id, p_name: p.data.name, p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    return ok({ id: data?.[0]?.id ?? "" })
  })
}

export async function updateApprovalFlow(input: unknown): Promise<Result> {
  return guard(async () => {
    const schema = flowSchema.extend({ flowId: z.uuid(), isActive: z.boolean() })
    const p = schema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del flujo.")
    const { error } = await (await createClient()).rpc("update_approval_flow", {
      p_flow: p.data.flowId, p_name: p.data.name, p_description: p.data.description ?? "", p_active: p.data.isActive,
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    return ok(undefined)
  })
}

const stepsSchema = z.object({
  flowId: z.uuid(),
  steps: z.array(z.object({ name: z.string().trim().min(1).max(120), position: z.uuid() })).min(1).max(20),
})

export async function setFlowSteps(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = stepsSchema.safeParse(input)
    if (!p.success) return fail("Cada paso necesita un nombre y un cargo.")
    const { error } = await (await createClient()).rpc("set_flow_steps", {
      p_flow: p.data.flowId, p_steps: p.data.steps as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    return ok(undefined)
  })
}

const requestSchema = z.object({
  flowId: z.uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
})

export async function createApprovalRequest(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = requestSchema.safeParse(input)
    if (!p.success) return fail("Revisa el flujo y el título.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_approval_request", {
      p_org: user.organization.id, p_flow: p.data.flowId, p_title: p.data.title, p_description: p.data.description ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    after(() => deliverChat().catch((e) => console.error("chat", e)))
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function decideApprovalStep(input: { requestId: string; approve: boolean; comment?: string }): Promise<Result> {
  return guard(async () => {
    if (!isUuid(input.requestId)) return fail(GENERIC)
    const comment = (input.comment ?? "").trim().slice(0, 2000)
    const { error } = await (await createClient()).rpc("decide_approval_step", {
      p_request: input.requestId, p_approve: !!input.approve, p_comment: comment,
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    return ok(undefined)
  })
}

export async function cancelApprovalRequest(requestId: string, reason?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(requestId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("cancel_approval_request", {
      p_request: requestId, p_reason: (reason ?? "").trim().slice(0, 500),
    })
    if (error) return fail(dbMessage(error))
    revalidateApprovals()
    return ok(undefined)
  })
}

export async function exportSolicitudesCsv(): Promise<string> {
  const rows = await listApprovalRequests(await getCurrentUser())
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Título", value: (r) => r.title },
    { header: "Flujo", value: (r) => r.flowName },
    { header: "Estado", value: (r) => r.status },
    { header: "Paso", value: (r) => `${r.currentStep}/${r.totalSteps}` },
  ])
}

// ---------- BI / Constructor de informes (v1.4-6) ----------

function revalidateReports() {
  revalidatePath("/app/informes", "layout")
}

const SCOPES = ["privada", "compartida"] as const

/** Corre un informe: carga el dataset (RLS) y aplica el config validado contra el catálogo. */
export async function runReport(dataset: string, config: unknown): Promise<Result<ReportResult>> {
  return guard(async () => {
    if (!(DATASET_KEYS as string[]).includes(dataset)) return fail("Fuente no válida.")
    const key = dataset as DatasetKey
    const clean = sanitizeConfig(key, (config ?? {}) as Partial<ReportConfig>)
    const rows = await loadDataset(key)
    return ok(runConfig(key, rows, clean))
  })
}

const saveReportSchema = z.object({
  name: z.string().trim().min(2).max(120),
  dataset: z.enum(DATASET_KEYS as [DatasetKey, ...DatasetKey[]]),
  scope: z.enum(SCOPES),
})

export async function createSavedReport(input: { name: string; dataset: string; scope: string; config: unknown }): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = saveReportSchema.safeParse(input)
    if (!p.success) return fail("Revisa el nombre y la fuente del informe.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const clean = sanitizeConfig(p.data.dataset, (input.config ?? {}) as Partial<ReportConfig>)
    const { data, error } = await (await createClient()).rpc("create_saved_report", {
      p_org: user.organization.id, p_name: p.data.name, p_dataset: p.data.dataset,
      p_config: clean as unknown as Json, p_scope: p.data.scope,
    })
    if (error) return fail(dbMessage(error))
    revalidateReports()
    return ok({ id: data?.[0]?.id ?? "" })
  })
}

export async function updateSavedReport(input: { id: string; name: string; dataset: string; scope: string; config: unknown }): Promise<Result> {
  return guard(async () => {
    const p = saveReportSchema.safeParse(input)
    if (!p.success || !isUuid(input.id)) return fail("Revisa los datos del informe.")
    const clean = sanitizeConfig(p.data.dataset, (input.config ?? {}) as Partial<ReportConfig>)
    const { error } = await (await createClient()).rpc("update_saved_report", {
      p_report: input.id, p_name: p.data.name, p_dataset: p.data.dataset,
      p_config: clean as unknown as Json, p_scope: p.data.scope,
    })
    if (error) return fail(dbMessage(error))
    revalidateReports()
    return ok(undefined)
  })
}

export async function discardSavedReport(id: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(id)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("discard_saved_report", { p_report: id })
    if (error) return fail(dbMessage(error))
    revalidateReports()
    return ok(undefined)
  })
}

export async function exportReportCsv(dataset: string, config: unknown): Promise<string> {
  if (!(DATASET_KEYS as string[]).includes(dataset)) return ""
  const key = dataset as DatasetKey
  const clean = sanitizeConfig(key, (config ?? {}) as Partial<ReportConfig>)
  const result = runConfig(key, await loadDataset(key), clean)
  return toCsv(result.rows, result.columns.map((c) => ({ header: c.label, value: (r: ReportRow) => { const v = r[c.field]; return v === null || v === undefined ? "" : String(v) } })))
}

// ---------- Notificaciones Slack/Teams (v1.4-7) ----------

function revalidateNotifiers() {
  revalidatePath("/app/admin")
}

const PROVIDERS = ["slack", "teams"] as const

const notifierSchema = z.object({
  provider: z.enum(PROVIDERS),
  url: z.string().trim().max(500),
  name: z.string().trim().min(2).max(80),
  events: z.array(z.enum(CHAT_EVENTS)).min(1).max(CHAT_EVENTS.length),
})

export async function createChatNotifier(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = notifierSchema.safeParse(input)
    if (!p.success) return fail("Revisa el proveedor, la URL y los eventos.")
    if (!isAllowedChatUrl(p.data.url)) return fail("La URL debe ser de Slack (hooks.slack.com) o Teams (…webhook.office.com) y usar https.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_chat_notifier", {
      p_org: user.organization.id, p_provider: p.data.provider, p_url: p.data.url, p_name: p.data.name, p_events: p.data.events,
    })
    if (error) return fail(dbMessage(error))
    revalidateNotifiers()
    return ok({ id: data?.[0]?.id ?? "" })
  })
}

export async function updateChatNotifier(input: { id: string; url: string; name: string; events: string[]; enabled: boolean }): Promise<Result> {
  return guard(async () => {
    const p = notifierSchema.omit({ provider: true }).extend({ id: z.uuid(), enabled: z.boolean() }).safeParse(input)
    if (!p.success) return fail("Revisa los datos del canal.")
    if (!isAllowedChatUrl(p.data.url)) return fail("La URL debe ser de Slack o Teams y usar https.")
    const { error } = await (await createClient()).rpc("update_chat_notifier", {
      p_notifier: p.data.id, p_url: p.data.url, p_name: p.data.name, p_events: p.data.events, p_enabled: p.data.enabled,
    })
    if (error) return fail(dbMessage(error))
    revalidateNotifiers()
    return ok(undefined)
  })
}

export async function discardChatNotifier(id: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(id)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("discard_chat_notifier", { p_notifier: id })
    if (error) return fail(dbMessage(error))
    revalidateNotifiers()
    return ok(undefined)
  })
}

/** Envía un mensaje de prueba al canal (verifica la URL sin esperar un evento). */
export async function testChatNotifier(id: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(id)) return fail(GENERIC)
    const target = await getChatNotifierTarget(id)
    if (!target) return fail("Canal no encontrado.")
    const r = await sendChat(target.provider, target.url, "✅ CrubolDocs: prueba de notificación. Si ves esto, el canal quedó configurado.")
    if (!r.ok) return fail(`No pudimos publicar: ${r.error ?? "revisa la URL"}.`)
    return ok(undefined)
  })
}

// ---------- IA aplicada (v1.5-1) ----------

/** Genera un borrador con IA (causa/acciones de NC, resumen de auditoría/acta, borrador de documento). */
export async function suggestWithAi(input: DraftInput): Promise<Result<{ text: string; remaining: number }>> {
  return guard(() => generateDraft(input))
}

// ---------- Causa raíz estructurada (v1.5-2) ----------

const CATS = ["metodo", "maquina", "mano_obra", "material", "medio", "medicion"] as const
const rcaSchema = z.discriminatedUnion("method", [
  z.object({
    ncId: z.uuid(),
    method: z.literal("5porques"),
    conclusion: z.string().trim().max(2000).optional(),
    data: z.object({ problem: z.string().trim().max(1000), steps: z.array(z.string().trim().max(1000)).max(12) }),
  }),
  z.object({
    ncId: z.uuid(),
    method: z.literal("ishikawa"),
    conclusion: z.string().trim().max(2000).optional(),
    data: z.object({ categories: z.object(Object.fromEntries(CATS.map((c) => [c, z.array(z.string().trim().max(500)).max(20)])) as Record<(typeof CATS)[number], z.ZodArray<z.ZodString>>) }),
  }),
])

/** Guarda el análisis estructurado de causa (uno por NC). No toca la causa raíz: eso lo hace setNcCause. */
export async function saveRcaAnalysis(input: unknown): Promise<Result> {
  return guard(async () => {
    const p = rcaSchema.safeParse(input)
    if (!p.success) return fail("Revisa el análisis de causa.")
    const { error } = await (await createClient()).rpc("save_rca_analysis", {
      p_nc: p.data.ncId, p_method: p.data.method, p_data: p.data.data as unknown as Json, p_conclusion: p.data.conclusion ?? "",
    })
    if (error) return fail(dbMessage(error))
    revalidateNc()
    return ok(undefined)
  })
}

// ---------- SCAR: solicitud de acción correctiva a proveedor (v1.5-3) ----------

const scarSchema = z.object({
  supplierId: z.uuid(),
  nonconformityId: z.uuid().nullish(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(4000),
  dueDays: z.number().int().min(1).max(365).optional(),
})

export async function createScar(input: unknown): Promise<Result<{ code: string; token: string }>> {
  return guard(async () => {
    const p = scarSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del SCAR.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const token = randomBytes(18).toString("hex")
    const { data, error } = await (await createClient()).rpc("create_scar", {
      p_org: user.organization.id, p_supplier: p.data.supplierId, p_nc: (p.data.nonconformityId ?? null) as unknown as string,
      p_title: p.data.title, p_description: p.data.description, p_due_days: p.data.dueDays ?? 15, p_token: token,
    })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    revalidatePath("/app/no-conformidades", "layout")
    return ok({ code: data?.[0]?.code ?? "", token })
  })
}

export async function reviewScar(scarId: string, accept: boolean, notes?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(scarId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("review_scar", {
      p_scar: scarId, p_accept: !!accept, p_notes: (notes ?? "").trim().slice(0, 2000),
    })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok(undefined)
  })
}

export async function cancelScar(scarId: string, reason?: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(scarId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("cancel_scar", { p_scar: scarId, p_reason: (reason ?? "").trim().slice(0, 500) })
    if (error) return fail(dbMessage(error))
    revalidateSuppliers()
    return ok(undefined)
  })
}

/** Respuesta pública del proveedor (sin sesión): CAPTCHA + rate-limit, luego RPC anónimo. */
export async function submitScarResponse(input: {
  token: string
  rootCause: string
  actions: string
  commitDate?: string
  captchaToken: string
}): Promise<Result> {
  return guard(async () => {
    const token = String(input.token ?? "")
    if (token.length < 16 || token.length > 128) return fail("Este formulario no está disponible.")
    const rootCause = String(input.rootCause ?? "").trim().slice(0, 4000)
    const actions = String(input.actions ?? "").trim().slice(0, 4000)
    if (rootCause.length < 3 || actions.length < 3) return fail("Completa la causa raíz y las acciones.")
    const commit = input.commitDate && /^\d{4}-\d{2}-\d{2}$/.test(input.commitDate) ? input.commitDate : null
    const ip = await clientIp()
    if (!(await verifyTurnstile(input.captchaToken, "scar", ip))) return fail(CAPTCHA_FAILED)
    if (!(await withinLimits([["scar:ip", ip], ["scar:token_ip", `${token}|${ipKey(ip) ?? "x"}`]]))) return fail(TOO_MANY)
    const { error } = await (await createClient()).rpc("submit_scar_response", {
      p_token: token, p_root_cause: rootCause, p_actions: actions, p_commit_date: commit as unknown as string, p_ip_hash: ip ? sha256Hex(`${ip}|${token}`) : "",
    })
    if (error) return fail(dbMessage(error, "Este formulario no está disponible."))
    return ok(undefined)
  })
}

// ---------- Inspecciones / Control de calidad (v1.6-1) ----------

const characteristicSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["numerico", "pasa_falla"]),
  unit: z.string().trim().max(24).optional().nullable(),
  min: z.number().finite().optional().nullable(),
  max: z.number().finite().optional().nullable(),
})
const characteristicsSchema = z.array(characteristicSchema).max(40)

const planSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  processId: z.string().uuid().optional().nullable(),
  characteristics: characteristicsSchema,
})

const inspectionSchema = z.object({
  planId: z.string().uuid(),
  type: z.enum(["recepcion", "proceso", "final"]),
  supplierId: z.string().uuid().optional().nullable(),
  processId: z.string().uuid().optional().nullable(),
  lotRef: z.string().trim().max(120).optional().nullable(),
  lotSize: z.number().int().min(0).max(100000000).optional().nullable(),
  sampleSize: z.number().int().min(0).max(100000000).optional().nullable(),
  acceptanceNumber: z.number().int().min(0).max(100000000).optional().nullable(),
  defects: z.number().int().min(0).max(100000000).optional().nullable(),
  disposition: z.enum(["pendiente", "aceptado", "rechazado", "concesion"]),
  results: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    value: z.number().finite().optional().nullable(),
    passed: z.boolean().optional().nullable(),
  })).max(40),
})

const revalidateInspections = () => revalidatePath("/app/inspecciones", "layout")

export async function createInspectionPlan(input: unknown): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const p = planSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del plan.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_inspection_plan", {
      p_org: user.organization.id, p_name: p.data.name, p_description: (p.data.description ?? "").trim(),
      p_process: (p.data.processId ?? null) as unknown as string, p_characteristics: p.data.characteristics as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateInspections()
    return ok({ id: data?.[0]?.id ?? "" })
  })
}

export async function updateInspectionPlan(planId: string, input: unknown, active: boolean): Promise<Result> {
  return guard(async () => {
    if (!isUuid(planId)) return fail(GENERIC)
    const p = planSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del plan.")
    const { error } = await (await createClient()).rpc("update_inspection_plan", {
      p_plan: planId, p_name: p.data.name, p_description: (p.data.description ?? "").trim(),
      p_active: !!active, p_characteristics: p.data.characteristics as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateInspections()
    return ok(undefined)
  })
}

export async function createInspection(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = inspectionSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos de la inspección.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("create_inspection", {
      p_org: user.organization.id, p_plan: p.data.planId, p_type: p.data.type,
      p_supplier: (p.data.supplierId ?? null) as unknown as string, p_process: (p.data.processId ?? null) as unknown as string,
      p_lot_ref: (p.data.lotRef ?? "").trim(), p_lot_size: (p.data.lotSize ?? null) as unknown as number,
      p_sample_size: (p.data.sampleSize ?? null) as unknown as number, p_acceptance: (p.data.acceptanceNumber ?? null) as unknown as number,
      p_defects: (p.data.defects ?? null) as unknown as number, p_disposition: p.data.disposition,
      p_results: p.data.results as unknown as Json,
    })
    if (error) return fail(dbMessage(error))
    revalidateInspections()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function generateNcFromInspection(inspectionId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(inspectionId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_inspection", { p_inspection: inspectionId })
    if (error) return fail(dbMessage(error))
    revalidateInspections()
    revalidatePath("/app/no-conformidades", "layout")
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function generateNcOutputFromInspection(inspectionId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(inspectionId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_output_from_inspection", { p_inspection: inspectionId })
    if (error) return fail(dbMessage(error))
    revalidateInspections()
    revalidatePath("/app/salidas-no-conformes", "layout")
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function exportInspectionsCsv(): Promise<string> {
  const rows = await listInspections()
  const TYPE: Record<string, string> = { recepcion: "Recepción", proceso: "Proceso", final: "Final" }
  const DISP: Record<string, string> = { pendiente: "Pendiente", aceptado: "Aceptado", rechazado: "Rechazado", concesion: "Concesión" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Tipo", value: (r) => TYPE[r.type] },
    { header: "Plan", value: (r) => r.planName },
    { header: "Proveedor", value: (r) => r.supplierName ?? "" },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Disposición", value: (r) => DISP[r.disposition] },
    { header: "Fecha", value: (r) => formatDate(r.inspectedAt) },
  ])
}

// ---------- Incidentes/accidentes SST (v1.6-2) ----------

const incidentSchema = z.object({
  kind: z.enum(["accidente", "incidente", "casi_accidente"]),
  occurredAt: z.string().trim().min(1),
  location: z.string().trim().max(200).optional().nullable(),
  processId: z.string().uuid().optional().nullable(),
  hazardId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(3).max(4000),
  immediateAction: z.string().trim().max(2000).optional().nullable(),
  severity: z.enum(["sin_lesion", "leve", "grave", "mortal"]),
  affectedName: z.string().trim().max(160).optional().nullable(),
  affectedDocument: z.string().trim().max(40).optional().nullable(),
  affectedPositionId: z.string().uuid().optional().nullable(),
  injury: z.string().trim().max(200).optional().nullable(),
  bodyPart: z.string().trim().max(120).optional().nullable(),
  lostDays: z.number().int().min(0).max(100000).optional().nullable(),
})

const revalidateIncidents = () => revalidatePath("/app/incidentes", "layout")

function incidentRpcArgs(d: z.infer<typeof incidentSchema>) {
  return {
    p_kind: d.kind, p_occurred_at: d.occurredAt, p_location: (d.location ?? "").trim(),
    p_process: (d.processId ?? null) as unknown as string, p_hazard: (d.hazardId ?? null) as unknown as string,
    p_description: d.description, p_immediate_action: (d.immediateAction ?? "").trim(), p_severity: d.severity,
    p_affected_name: (d.affectedName ?? "").trim(), p_affected_document: (d.affectedDocument ?? "").trim(),
    p_affected_position: (d.affectedPositionId ?? null) as unknown as string,
    p_injury: (d.injury ?? "").trim(), p_body_part: (d.bodyPart ?? "").trim(),
    p_lost_days: (d.lostDays ?? null) as unknown as number,
  }
}

export async function reportIncident(input: unknown): Promise<Result<{ code: string }>> {
  return guard(async () => {
    const p = incidentSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del incidente.")
    const user = await getCurrentUser()
    if (!user.organization.id) return fail("Sin organización activa.")
    const { data, error } = await (await createClient()).rpc("report_incident", { p_org: user.organization.id, ...incidentRpcArgs(p.data) })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function updateIncident(incidentId: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!isUuid(incidentId)) return fail(GENERIC)
    const p = incidentSchema.safeParse(input)
    if (!p.success) return fail("Revisa los datos del incidente.")
    const { error } = await (await createClient()).rpc("update_incident", { p_incident: incidentId, ...incidentRpcArgs(p.data) })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    return ok(undefined)
  })
}

export async function setIncidentInvestigation(incidentId: string, investigatorPositionId: string | null, investigatedAt: string | null): Promise<Result> {
  return guard(async () => {
    if (!isUuid(incidentId)) return fail(GENERIC)
    if (investigatorPositionId && !isUuid(investigatorPositionId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("set_incident_investigation", {
      p_incident: incidentId, p_investigator: (investigatorPositionId ?? null) as unknown as string,
      p_investigated_at: (investigatedAt ?? null) as unknown as string,
    })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    return ok(undefined)
  })
}

export async function generateNcFromIncident(incidentId: string): Promise<Result<{ code: string }>> {
  return guard(async () => {
    if (!isUuid(incidentId)) return fail(GENERIC)
    const { data, error } = await (await createClient()).rpc("generate_nc_from_incident", { p_incident: incidentId })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    revalidatePath("/app/no-conformidades", "layout")
    return ok({ code: data?.[0]?.code ?? "" })
  })
}

export async function closeIncident(incidentId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(incidentId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("close_incident", { p_incident: incidentId })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    return ok(undefined)
  })
}

export async function cancelIncident(incidentId: string, reason: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(incidentId)) return fail(GENERIC)
    const { error } = await (await createClient()).rpc("cancel_incident", { p_incident: incidentId, p_reason: (reason ?? "").trim() })
    if (error) return fail(dbMessage(error))
    revalidateIncidents()
    return ok(undefined)
  })
}

export async function exportIncidentsCsv(): Promise<string> {
  const rows = await listIncidents()
  const KIND: Record<string, string> = { accidente: "Accidente", incidente: "Incidente", casi_accidente: "Casi-accidente" }
  const SEV: Record<string, string> = { sin_lesion: "Sin lesión", leve: "Leve", grave: "Grave", mortal: "Mortal" }
  const STATUS: Record<string, string> = { reportado: "Reportado", en_investigacion: "En investigación", cerrado: "Cerrado", anulado: "Anulado" }
  return toCsv(rows, [
    { header: "Código", value: (r) => r.code },
    { header: "Tipo", value: (r) => KIND[r.kind] },
    { header: "Severidad", value: (r) => SEV[r.severity] },
    { header: "Estado", value: (r) => STATUS[r.status] },
    { header: "Proceso", value: (r) => r.processName ?? "" },
    { header: "Lugar", value: (r) => r.location ?? "" },
    { header: "Ocurrió", value: (r) => formatDate(r.occurredAt) },
    { header: "Investigación vence", value: (r) => (r.investigationDue ? formatDate(r.investigationDue) : "") },
  ])
}

// ---------- Importación CSV (v1.6-4) ----------

const PROC_TYPES = ["estrategico", "misional", "apoyo", "evaluacion"]
const SUP_KINDS = ["bien", "servicio", "ambos"]
const CRITICALITIES = ["alta", "media", "baja"]
const SOURCE_TYPES = ["ley", "decreto", "resolucion", "norma_iso", "contractual", "otro"]
const FREQUENCIES = ["semestral", "anual", "bienal"]

type SupaClient = Awaited<ReturnType<typeof createClient>>
/** Validación por fila: error, o resumen + creador (devuelve mensaje de error o null). */
type RowOutcome = { error: string } | { summary: string; create: (sb: SupaClient) => Promise<string | null> }

/**
 * Importa un CSV reutilizando las reglas de creación de la app (RLS/autorización/contadores/log).
 * `commit=false` solo previsualiza (no escribe); `commit=true` crea las filas válidas.
 */
async function runImport(entity: string, csvText: string, commit: boolean): Promise<Result<ImportResult>> {
  return guard(async () => {
    if (!isImportEntity(entity)) return fail("Entidad no válida.")
    const user = await getCurrentUser()
    const org = user.organization.id
    if (!org) return fail("Sin organización activa.")
    if (!canManageCatalog(user)) return fail("No tienes permiso para importar.")

    let parsed
    try { parsed = parseCsv(csvText) } catch (e) { return fail(e instanceof Error ? e.message : "No pudimos leer el CSV.") }

    const supabase = await createClient()
    const [{ data: procs }, { data: positions }] = await Promise.all([
      supabase.from("processes").select("id, code, name").eq("organization_id", org),
      supabase.from("positions").select("id, name").eq("organization_id", org),
    ])
    const procByCode = new Map((procs ?? []).map((p) => [p.code.toUpperCase(), p.id]))
    const procByName = new Map((procs ?? []).map((p) => [p.name.toLowerCase(), p.id]))
    const posByName = new Map((positions ?? []).map((p) => [p.name.toLowerCase(), p.id]))
    const seenProcCode = new Set((procs ?? []).map((p) => p.code.toUpperCase()))
    const seenPosName = new Set((positions ?? []).map((p) => p.name.toLowerCase()))

    const field = (row: Record<string, string>, k: string) => (row[k] ?? "").trim()
    const resolveProc = (ref: string): { id: string | null } | { error: string } => {
      const v = ref.trim()
      if (!v) return { id: null }
      const id = procByCode.get(v.toUpperCase()) ?? procByName.get(v.toLowerCase())
      return id !== undefined ? { id } : { error: `proceso «${v}» no encontrado` }
    }

    function validate(row: Record<string, string>): RowOutcome {
      if (entity === "procesos") {
        const codigo = field(row, "codigo").toUpperCase(), nombre = field(row, "nombre"), tipo = field(row, "tipo").toLowerCase()
        if (!codigo || !nombre) return { error: "faltan codigo o nombre" }
        if (!/^[A-Z0-9]{2,6}$/.test(codigo)) return { error: "código inválido (2–6 letras/números)" }
        if (!PROC_TYPES.includes(tipo)) return { error: "tipo inválido" }
        let leader: string | null = null
        const lc = field(row, "lider_cargo")
        if (lc) { const id = posByName.get(lc.toLowerCase()); if (!id) return { error: `cargo líder «${lc}» no encontrado` }; leader = id }
        if (seenProcCode.has(codigo)) return { error: `ya existe un proceso ${codigo}` }
        seenProcCode.add(codigo)
        return {
          summary: `${codigo} · ${nombre}`,
          create: async (sb) => {
            const { error } = await sb.from("processes").insert({ organization_id: org, code: codigo, name: nombre, type: tipo, leader_position_id: leader }).select("id")
            return error ? (error.code === "23505" ? `ya existe ${codigo}` : dbMessage(error)) : null
          },
        }
      }
      if (entity === "cargos") {
        const nombre = field(row, "nombre")
        if (nombre.length < 2 || nombre.length > 120) return { error: "nombre de 2 a 120 caracteres" }
        const pr = resolveProc(field(row, "proceso"))
        if ("error" in pr) return pr
        if (seenPosName.has(nombre.toLowerCase())) return { error: `ya existe el cargo «${nombre}»` }
        seenPosName.add(nombre.toLowerCase())
        return {
          summary: nombre,
          create: async (sb) => {
            const { error } = await sb.from("positions").insert({ organization_id: org, name: nombre, process_id: pr.id }).select("id")
            return error ? (error.code === "23505" ? `ya existe «${nombre}»` : dbMessage(error)) : null
          },
        }
      }
      if (entity === "proveedores") {
        const nombre = field(row, "nombre"), tipo = field(row, "tipo").toLowerCase(), crit = field(row, "criticidad").toLowerCase()
        if (!nombre) return { error: "falta nombre" }
        if (!SUP_KINDS.includes(tipo)) return { error: "tipo inválido (bien/servicio/ambos)" }
        if (!CRITICALITIES.includes(crit)) return { error: "criticidad inválida (alta/media/baja)" }
        const pr = resolveProc(field(row, "proceso"))
        if ("error" in pr) return pr
        return {
          summary: nombre,
          create: async (sb) => {
            const { error } = await sb.rpc("create_supplier", {
              p_org: org, p_name: nombre, p_nit: field(row, "nit"), p_kind: tipo, p_category: field(row, "categoria"),
              p_criticality: crit, p_process: (pr.id ?? null) as unknown as string,
              p_contact_name: field(row, "contacto_nombre"), p_contact_email: field(row, "contacto_email"), p_contact_phone: field(row, "contacto_telefono"),
            })
            return error ? dbMessage(error) : null
          },
        }
      }
      // requisitos
      const titulo = field(row, "titulo"), src = field(row, "tipo_fuente").toLowerCase(), ref = field(row, "referencia"), desc = field(row, "descripcion")
      const freqRaw = field(row, "frecuencia").toLowerCase(), freq = freqRaw || "anual"
      if (!titulo || !ref || !desc) return { error: "faltan titulo, referencia o descripcion" }
      if (!SOURCE_TYPES.includes(src)) return { error: "tipo_fuente inválido" }
      if (freqRaw && !FREQUENCIES.includes(freq)) return { error: "frecuencia inválida" }
      const pr = resolveProc(field(row, "proceso"))
      if ("error" in pr) return pr
      return {
        summary: `${ref} · ${titulo}`,
        create: async (sb) => {
          const { error } = await sb.rpc("create_requirement", {
            p_org: org, p_title: titulo, p_source: src, p_reference: ref, p_issuer: field(row, "emisor"),
            p_description: desc, p_process: (pr.id ?? null) as unknown as string, p_url: field(row, "url"), p_frequency: freq,
          })
          return error ? dbMessage(error) : null
        },
      }
    }

    const outRows: ImportPreviewRow[] = []
    let valid = 0, errors = 0, created = 0
    for (let i = 0; i < parsed.rows.length; i++) {
      const line = i + 1
      const res = validate(parsed.rows[i])
      if ("error" in res) { outRows.push({ line, summary: "", ok: false, error: res.error }); errors++; continue }
      valid++
      if (commit) {
        const err = await res.create(supabase)
        if (err) { outRows.push({ line, summary: res.summary, ok: false, error: err }); errors++; valid--; continue }
        created++
      }
      outRows.push({ line, summary: res.summary, ok: true, error: null })
    }

    if (commit) {
      revalidatePath("/app/admin", "layout")
      await logImport(entity, created, errors)
    }
    return ok({ rows: outRows, valid, errors, committed: commit, created })
  })
}

async function logImport(entity: string, created: number, errors: number): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user.organization.id) return
    await (await createClient()).rpc("log_event", {
      org: user.organization.id, p_action: "importar_csv", p_entity_type: "Importacion", p_entity_id: null as unknown as string,
      p_label: IMPORT_ENTITIES[entity as ImportEntity].label, p_diff: { creadas: created, errores: errors } as unknown as Json,
    })
  } catch { /* el log no bloquea la importación */ }
}

export async function previewImport(entity: string, csvText: string): Promise<Result<ImportResult>> {
  return runImport(entity, csvText, false)
}

export async function commitImport(entity: string, csvText: string): Promise<Result<ImportResult>> {
  return runImport(entity, csvText, true)
}
