"use server"

// Mutaciones (Server Actions). Escriben con la sesión del usuario: la RLS y las funciones
// del flujo (security definer) validan rol, estado y segregación. La clave de servidor solo
// se usa donde el diseño lo exige: firma tras reautenticación, invitaciones, Storage,
// auditoría de acciones administrativas y outbox de correo.

import { randomUUID } from "node:crypto"
import type { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { z } from "zod"

import { toCsv } from "@/lib/csv"
import { newToken, sha256Hex } from "@/lib/data/hash"
import { getCurrentUser, isUuid, listAllDocuments, listAllRisks, listAuditLog, searchDocuments } from "@/lib/data/queries"
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
import { DOCUMENT_STATUS_META, SIGNATURE_MEANING, segregationError } from "@/lib/domain/documents"
import { EVIDENCE_EXT, isEvidenceName, isPdfName, isSourceName, SOURCE_EXT } from "@/lib/domain/files"
import { RISK_LEVEL_LABELS } from "@/lib/domain/risk"
import { flushOutbox, smtpConfigured } from "@/lib/email/outbox"
import { formatDate, formatDateTime, todayIsoDate } from "@/lib/format"
import { createAdminClient, createClient, createEphemeralClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import type {
  AuditFilters,
  ControlType,
  CurrentUser,
  DocumentFilters,
  DocumentSummary,
  EvidenceResult,
  Result,
  RiskFilters,
} from "@/lib/types"

const ok = <T,>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })
const GENERIC = "No pudimos completar la acción. Inténtalo de nuevo en unos minutos."
const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")

/** Mensaje para el usuario a partir del error de la base (las funciones del flujo ya lo redactan). */
function dbMessage(e: PostgrestError | null, fallback = GENERIC): string {
  if (!e) return fallback
  if (["42501", "22023", "P0002"].includes(e.code) && e.message && !e.message.includes("row-level security")) return e.message
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

/** Registro de auditoría para acciones que no pasan por funciones del flujo. */
async function audit(user: CurrentUser, action: string, entityType: string, entityId: string, label: string, diff: Record<string, unknown> = {}) {
  await createAdminClient().rpc("log_event", {
    org: user.organization.id,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_label: label,
    p_diff: diff as Json,
    p_actor: user.id,
  })
}

const refresh = () => revalidatePath("/app", "layout")

// ---------- Acceso ----------

export async function login(email: string, password: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  return error ? fail("Correo o contraseña incorrectos.") : ok(undefined)
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/** Respuesta siempre genérica: no revela si el correo existe. */
export async function requestPasswordReset(email: string): Promise<Result> {
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${APP_URL()}/auth/confirmar?siguiente=/restablecer`,
  })
  return ok(undefined)
}

/** Nueva contraseña tras abrir el enlace de recuperación (la sesión la crea /auth/confirmar). */
export async function updatePassword(password: string): Promise<Result> {
  if (password.length < 10) return fail("La contraseña debe tener al menos 10 caracteres.")
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return fail(
      error.code === "same_password"
        ? "Usa una contraseña distinta a la anterior."
        : "El enlace venció o ya fue usado. Solicita uno nuevo."
    )
  }
  return ok(undefined)
}

export async function acceptInvitation(
  token: string,
  input: { fullName: string; password: string; acceptsDataPolicy: boolean }
): Promise<Result> {
  return guard(async () => {
    if (!input.acceptsDataPolicy) return fail("Debes aceptar la política de tratamiento de datos.")
    if (input.password.length < 10) return fail("La contraseña debe tener al menos 10 caracteres.")
    const fullName = input.fullName.trim().slice(0, 200)
    if (fullName.length < 3) return fail("Escribe tu nombre completo.")
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return fail("Esta invitación venció o ya fue usada.")

    const admin = createAdminClient()
    const { data: inv } = await admin.from("invitations").select("*").eq("token_hash", sha256Hex(token)).maybeSingle()
    const { data: org } = inv
      ? await admin.from("organizations").select("status").eq("id", inv.organization_id).single()
      : { data: null }
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date() || org?.status !== "activa") {
      return fail("Esta invitación venció o ya fue usada.")
    }

    // ¿Ya tiene cuenta? Se exige su contraseña actual para vincular la organización.
    const { data: existing } = await admin.from("profiles").select("id").eq("email", inv.email).maybeSingle()
    let userId = existing?.id
    if (userId) {
      const check = await createEphemeralClient().auth.signInWithPassword({ email: inv.email, password: input.password })
      if (check.error) return fail("Ya tienes una cuenta con este correo. Escribe tu contraseña actual para unirte.")
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: inv.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error || !data.user) {
        return fail(error?.code === "weak_password" ? "La contraseña es muy débil. Usa una más larga y difícil de adivinar." : GENERIC)
      }
      userId = data.user.id
    }

    const membership = {
      organization_id: inv.organization_id,
      user_id: userId,
      position_id: inv.position_id,
      is_org_admin: inv.is_org_admin,
      is_external: inv.is_external,
      valid_from: todayIsoDate(),
      valid_until: inv.valid_until,
      status: "activo",
      last_recertified_at: new Date().toISOString(),
    }
    const { error: mErr } = await admin.from("memberships").upsert(membership, { onConflict: "organization_id,user_id" })
    if (mErr) return fail(dbMessage(mErr))
    await admin.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id)
    await admin.from("profiles").update({ full_name: fullName, active_org: inv.organization_id }).eq("id", userId)
    const { data: pos } = await admin.from("positions").select("name").eq("id", inv.position_id).single()
    await admin.rpc("log_event", {
      org: inv.organization_id,
      p_action: "aceptar_invitacion",
      p_entity_type: "Membresía",
      p_entity_id: inv.id,
      p_label: pos?.name ?? inv.email,
      p_diff: { politica_datos: { before: null, after: `aceptada ${new Date().toISOString()}` } },
      p_actor: userId,
    })

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: inv.email, password: input.password })
    return error ? fail("Tu cuenta quedó lista. Ingresa con tu correo y contraseña.") : ok(undefined)
  })
}

/** Cambia la organización activa (usuarios con varias membresías y Superadmin). */
export async function setActiveOrganization(orgId: string): Promise<Result> {
  if (!isUuid(orgId)) return fail("Organización no válida.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_active_org", { org: orgId })
  if (error) return fail(dbMessage(error))
  refresh()
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
    const sourceFileName = String(input.sourceFileName ?? "").trim().slice(0, 255)
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

    const ephemeral = createEphemeralClient()
    const { data: reauth, error: authErr } = await ephemeral.auth.signInWithPassword({ email: user.email, password: input.password })
    if (authErr || reauth.user?.id !== user.id) return fail("La contraseña no es correcta. La firma no se registró.")
    await ephemeral.auth.signOut({ scope: "local" })

    // Lo que se firma es el hash registrado: el PDF guardado debe seguir correspondiendo (ADR-004).
    if (!version.pdf_path || !version.pdf_sha256 || !(await storedFileMatches("documentos", version.pdf_path, version.pdf_sha256))) {
      console.error("firma: el PDF guardado no coincide con el hash registrado", { version: id })
      return fail("El PDF guardado no coincide con el registrado. La firma no se registró; avisa al Líder SIG.")
    }

    const h = await headers()
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null
    const { error } = await createAdminClient().rpc("sign_version", {
      p_version: id,
      p_signer: user.id,
      p_action: input.action,
      p_meaning: SIGNATURE_MEANING[input.action],
      p_ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : undefined,
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
      p_file_name: file ? (input.fileName ?? "").slice(0, 255) : undefined,
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
const linkIfNoMail = (token: string) => (smtpConfigured() ? null : invitationLink(token))

/** Crea la invitación (RLS: Admin o Líder SIG) y encola el correo con el enlace. */
async function createInvitation(
  user: CurrentUser,
  org: { id: string; name: string },
  input: { email: string; positionId: string; isExternal: boolean; validUntil: string | null; isOrgAdmin: boolean }
): Promise<InviteResult> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const email = input.email.trim().toLowerCase()

  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
  if (profile) {
    const { data: m } = await admin
      .from("memberships")
      .select("status")
      .eq("organization_id", org.id)
      .eq("user_id", profile.id)
      .maybeSingle()
    if (m?.status === "activo") return fail("Este correo ya pertenece a la organización.")
  }

  const token = newToken()
  const { data: inv, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: org.id,
      email,
      position_id: input.positionId,
      is_org_admin: input.isOrgAdmin,
      is_external: input.isExternal,
      valid_until: input.isExternal ? input.validUntil : null,
      token_hash: sha256Hex(token),
      invited_by: user.id,
    })
    .select("id, expires_at")
    .single()
  if (error || !inv) return fail(dbMessage(error))

  await enqueueInvitationEmail(org.id, org.name, input.positionId, email, token, inv.expires_at)
  await audit({ ...user, organization: org }, "invitar_usuario", "Membresía", inv.id, email, { externo: input.isExternal })
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
    const expires = new Date(Date.now() + 7 * 86_400_000).toISOString()
    const { error } = await createAdminClient()
      .from("invitations")
      .update({ token_hash: sha256Hex(token), expires_at: expires })
      .eq("id", inv.id)
    if (error) return fail(dbMessage(error))
    // El correo anterior lleva un token que ya no sirve.
    await createAdminClient().from("email_outbox").delete().eq("to_email", inv.email).eq("template", "invitacion").eq("status", "pendiente")
    await enqueueInvitationEmail(inv.organization_id, user.organization.name, inv.position_id, inv.email, token, expires)
    await audit(user, "reenviar_invitacion", "Membresía", inv.id, inv.email)
    sendMailLater()
    return ok({ link: linkIfNoMail(token) })
  })
}

export async function revokeAccess(membershipId: string): Promise<Result> {
  return guard(async () => {
    const user = await getCurrentUser()
    const inv = await managedInvitation(membershipId)
    if (inv) {
      await createAdminClient().from("invitations").delete().eq("id", inv.id)
      await audit(user, "cancelar_invitacion", "Membresía", inv.id, inv.email)
      refresh()
      return ok(undefined)
    }
    if (!isUuid(membershipId)) return fail("Membresía no válida.")
    const supabase = await createClient()
    const { data: m } = await supabase.from("memberships").select("user_id").eq("id", membershipId).maybeSingle()
    if (!m) return fail("No encontramos este acceso.")
    if (m.user_id === user.id) return fail("No puedes revocar tu propio acceso.")
    const { data, error } = await supabase.from("memberships").update({ status: "revocado" }).eq("id", membershipId).select("id")
    if (error || !data?.length) return fail(error ? dbMessage(error) : "No tienes permiso para esta acción.")
    await audit(user, "revocar_acceso", "Membresía", membershipId, m.user_id, { estado: { before: "activo", after: "revocado" } })
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
    const user = await getCurrentUser()
    const inv = await managedInvitation(membershipId)
    if (inv) {
      const { error } = await createAdminClient().from("invitations").update(patch).eq("id", inv.id)
      if (error) return fail(dbMessage(error))
    } else {
      if (!isUuid(membershipId)) return fail("Membresía no válida.")
      const supabase = await createClient()
      const { data, error } = await supabase.from("memberships").update(patch).eq("id", membershipId).select("id")
      if (error) return fail(error.code === "23514" ? "Un usuario externo debe tener fecha de fin de acceso." : dbMessage(error))
      if (!data?.length) return fail("No tienes permiso para esta acción.")
    }
    await audit(user, "editar_acceso", "Membresía", inv?.id ?? membershipId, inv?.email ?? membershipId, patch)
    refresh()
    return ok(undefined)
  })
}

export async function saveRecertDecisions(decisions: { membershipId: string; keep: boolean }[]): Promise<Result<{ count: number }>> {
  return guard(async () => {
    const valid = decisions.filter((d) => isUuid(d.membershipId))
    if (!valid.length) return fail("Marca al menos un acceso.")
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { error } = await supabase.from("access_recertifications").insert(
      valid.map((d) => ({
        organization_id: user.organization.id,
        membership_id: d.membershipId,
        reviewed_by: user.id,
        decision: d.keep ? "mantener" : "revocar",
      }))
    )
    if (error) return fail(dbMessage(error))
    const now = new Date().toISOString()
    const keep = valid.filter((d) => d.keep).map((d) => d.membershipId)
    const revoke = valid.filter((d) => !d.keep && d.membershipId).map((d) => d.membershipId)
    if (keep.length) await supabase.from("memberships").update({ last_recertified_at: now }).in("id", keep)
    if (revoke.length) {
      await supabase.from("memberships").update({ status: "revocado", last_recertified_at: now }).in("id", revoke).neq("user_id", user.id)
    }
    await createAdminClient().rpc("complete_tasks", {
      p_type: "recertificar_accesos",
      p_entity_id: user.organization.id,
      p_actor: user.id,
    })
    await audit(user, "recertificar_accesos", "Organización", user.organization.id, user.organization.name, {
      mantenidos: keep.length,
      revocados: revoke.length,
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
    await audit(user, input.id ? "editar_proceso" : "crear_proceso", "Proceso", data[0].id, `${code} ${name}`)
    refresh()
    return ok(undefined)
  })
}

export async function deleteProcess(processId: string): Promise<Result> {
  return guard(async () => {
    if (!isUuid(processId)) return fail("Proceso no válido.")
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { data, error } = await supabase.from("processes").delete().eq("id", processId).select("code, name")
    if (error) {
      return fail(
        error.code === "23503"
          ? "No puedes eliminar un proceso que tiene documentos, riesgos o cargos asociados. Reasígnalos primero."
          : dbMessage(error)
      )
    }
    if (!data?.length) return fail("No tienes permiso para esta acción.")
    await audit(user, "eliminar_proceso", "Proceso", processId, `${data[0].code} ${data[0].name}`)
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
    await audit(user, input.id ? "editar_tipo" : "crear_tipo", "Tipo documental", data[0].id, `${input.code} ${name}`)
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

    const unique = [...new Map(roles.data.map((r) => [`${r.role}|${r.processId ?? ""}`, r])).values()]
    const { error: dErr } = await supabase.from("position_roles").delete().eq("position_id", positionId)
    if (dErr) return fail(dbMessage(dErr))
    if (unique.length) {
      const { error: iErr } = await supabase
        .from("position_roles")
        .insert(unique.map((r) => ({ organization_id: org, position_id: positionId, role: r.role, process_id: r.processId })))
      if (iErr) return fail(dbMessage(iErr))
    }
    await audit(user, input.id ? "editar_cargo" : "crear_cargo", "Cargo", positionId, name, {
      roles: unique.map((r) => r.role).join(", "),
    })
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
    if (!user.isPlatformAdmin) return fail("No tienes permiso para esta acción.")

    const supabase = await createClient()
    const { data: org, error } = await supabase.from("organizations").insert({ name, nit }).select("id, name").single()
    if (error || !org) return fail(error?.code === "23505" ? "Ya existe una organización con ese NIT." : dbMessage(error))
    const { data: pos, error: pErr } = await supabase
      .from("positions")
      .insert({ organization_id: org.id, name: "Administrador" })
      .select("id")
      .single()
    if (pErr || !pos) return fail(dbMessage(pErr))
    await audit({ ...user, organization: org }, "crear_organizacion", "Organización", org.id, `${name} (${nit})`)
    const res = await createInvitation(user, org, {
      email: email.data,
      positionId: pos.id,
      isExternal: false,
      validUntil: null,
      isOrgAdmin: true,
    })
    refresh()
    return res
  })
}
