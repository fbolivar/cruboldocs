// Acceso a datos de lectura (servidor). Cada función consulta Supabase con la sesión del
// usuario: la RLS decide qué filas ve. Devuelven exactamente los tipos de vista de
// src/lib/types.ts; la UI no conoce el esquema.

import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { isMetadataOnly } from "@/lib/domain/documents"
import { CONTROL_FREQUENCY_LABELS, RISK_LEVELS } from "@/lib/domain/risk"
import { daysFromToday, todayIsoDate } from "@/lib/format"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { sha256Hex } from "@/lib/data/hash"
import type {
  ActivityEvent,
  AssessmentKind,
  AuditEntry,
  AuditFilters,
  ChangeRequest,
  Control,
  CurrentUser,
  DocumentDetail,
  DocumentFilters,
  DocumentStatus,
  DocumentSummary,
  DocumentType,
  DocumentVersion,
  HomeSummary,
  Invitation,
  Member,
  Organization,
  Paginated,
  PersonRef,
  Position,
  Process,
  ProcessType,
  RecertificationInfo,
  Risk,
  RiskFilters,
  RiskLevel,
  RiskMatrix,
  RiskSummaryRow,
  Role,
  SetupProgress,
  Task,
  TaskType,
  VersionStatus,
} from "@/lib/types"

export const PAGE_SIZE = 25
const SIGNED_URL_SECONDS = 600
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (v: string) => UUID_RE.test(v)

/** Columna `date` → mediodía en Bogotá (evita que la fecha cambie al formatearla). */
const dateOnly = (d: string) => `${d}T12:00:00-05:00`
const dateOnlyOrNull = (d: string | null) => (d ? dateOnly(d) : null)

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------- Sesión ----------

/** Usuario autenticado con su organización activa. Sin sesión → /login; sin acceso vigente → /sin-acceso. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  const uid = auth?.claims?.sub
  if (!uid) redirect("/login")

  const [{ data: profile }, { data: memberships }, { data: isPlatformAdmin }, { data: orgs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, active_org").eq("id", uid).maybeSingle(),
    supabase
      .from("memberships")
      .select("organization_id, position_id, is_org_admin, is_external, valid_from, valid_until, status")
      .eq("user_id", uid),
    supabase.rpc("is_platform_admin"),
    supabase.from("organizations").select("id, name, status").order("name"),
  ])

  const today = todayIsoDate()
  const valid = (memberships ?? []).filter(
    (m) => m.status === "activo" && m.valid_from <= today && (!m.valid_until || m.valid_until >= today)
  )
  const available = (orgs ?? []).filter(
    (o) => isPlatformAdmin || (o.status === "activa" && valid.some((m) => m.organization_id === o.id))
  )
  if (!profile || (!isPlatformAdmin && available.length === 0)) redirect("/sin-acceso")

  const org =
    available.find((o) => o.id === profile.active_org) ?? available[0] ?? { id: "", name: "Crubol", status: "activa" }
  const m = valid.find((x) => x.organization_id === org.id)

  let positionName: string | null = null
  let roles: CurrentUser["roles"] = []
  if (m?.position_id) {
    const [{ data: pos }, { data: pr }] = await Promise.all([
      supabase.from("positions").select("name").eq("id", m.position_id).maybeSingle(),
      supabase.from("position_roles").select("role, process_id").eq("position_id", m.position_id),
    ])
    positionName = pos?.name ?? null
    roles = (pr ?? []).map((r) => ({ role: r.role as Role, processId: r.process_id }))
  }

  return {
    id: uid,
    fullName: profile.full_name || profile.email,
    email: profile.email,
    positionId: m?.position_id ?? null,
    positionName,
    organization: { id: org.id, name: org.name },
    organizations: available.map((o) => ({ id: o.id, name: o.name })),
    isOrgAdmin: m?.is_org_admin ?? false,
    isPlatformAdmin: !!isPlatformAdmin,
    isExternal: m?.is_external ?? false,
    validUntil: m?.valid_until ?? null,
    roles,
  }
})

/** Cliente + organización activa. null si el superadmin aún no tiene organizaciones. */
async function scope() {
  const user = await getCurrentUser()
  if (!user.organization.id) return null
  return { supabase: await createClient(), user, org: user.organization.id }
}

// ---------- Personas ----------

type Directory = Map<string, { fullName: string; positionId: string | null; positionName: string }>

/** Miembros vigentes de la organización (nombre y cargo), vía org_directory. */
const getDirectory = cache(async (org: string): Promise<Directory> => {
  const supabase = await createClient()
  const { data } = await supabase.rpc("org_directory", { org })
  return new Map(
    (data ?? []).map((r) => [r.user_id, { fullName: r.full_name, positionId: r.position_id, positionName: r.position_name ?? "" }])
  )
})

/** PersonRef para una lista de usuarios; los que ya no son miembros se buscan en profiles. */
async function peopleOf(org: string, ids: (string | null | undefined)[]): Promise<(id: string) => PersonRef> {
  const dir = await getDirectory(org)
  const missing = [...new Set(ids.filter((x): x is string => !!x && !dir.has(x)))]
  const extra = new Map<string, string>()
  if (missing.length) {
    const supabase = await createClient()
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", missing)
    for (const p of data ?? []) extra.set(p.id, p.full_name)
  }
  return (id: string) => {
    const d = dir.get(id)
    if (d) return { id, fullName: d.fullName, positionName: d.positionName }
    return { id, fullName: extra.get(id) || "Usuario retirado", positionName: "" }
  }
}

// ---------- Bandeja ----------

const TASK_ROLE_RISK: Role[] = ["lider_sig", "lider_proceso", "responsable_control"]

export async function getMyTasks(user: CurrentUser): Promise<Task[]> {
  const s = await scope()
  if (!s || !user.positionId) return []
  const { data: rows } = await s.supabase
    .from("tasks")
    .select("id, type, entity_type, entity_id, entity_code, title, version_no, detail, due_date, origin_user_id")
    .eq("organization_id", s.org)
    .eq("assignee_position_id", user.positionId)
    .eq("status", "pendiente")
    .order("due_date")
  const tasks = rows ?? []

  const ids = (t: string) => tasks.filter((x) => x.entity_type === t).map((x) => x.entity_id)
  const [versions, requests, controls, person] = await Promise.all([
    ids("version").length
      ? s.supabase.from("document_versions").select("id, document_id").in("id", ids("version")).then((r) => r.data ?? [])
      : [],
    ids("solicitud").length
      ? s.supabase.from("change_requests").select("id, document_id").in("id", ids("solicitud")).then((r) => r.data ?? [])
      : [],
    ids("control").length
      ? s.supabase.from("controls").select("id, risk_id").in("id", ids("control")).then((r) => r.data ?? [])
      : [],
    peopleOf(s.org, tasks.map((t) => t.origin_user_id)),
  ])
  const docOf = new Map([...versions, ...requests].map((r) => [r.id, r.document_id]))
  const riskOf = new Map(controls.map((c) => [c.id, c.risk_id]))

  const href = (t: (typeof tasks)[number]) => {
    switch (t.entity_type) {
      case "documento":
        return `/app/documentos/${t.entity_id}`
      case "version":
      case "solicitud":
        return docOf.has(t.entity_id) ? `/app/documentos/${docOf.get(t.entity_id)}` : "/app/documentos"
      case "control":
        return riskOf.has(t.entity_id) ? `/app/riesgos?riesgo=${riskOf.get(t.entity_id)}` : "/app/riesgos"
      default:
        return "/app/admin?tab=recertificacion"
    }
  }

  return tasks.map((t) => ({
    id: t.id,
    type: t.type as TaskType,
    entityCode: t.entity_code,
    title: t.title,
    versionNo: t.version_no,
    detail: t.detail,
    dueDate: t.due_date,
    assigneePositionName: user.positionName ?? "",
    originName: t.origin_user_id ? person(t.origin_user_id).fullName : null,
    href: href(t),
  }))
}

export async function getHomeSummary(user: CurrentUser): Promise<HomeSummary> {
  const s = await scope()
  const riskRole = user.roles.some((r) => TASK_ROLE_RISK.includes(r.role))
  if (!s) return { pendingTasks: 0, overdueTasks: 0, documentsDueForReview30d: 0, pendingControls: riskRole ? 0 : null }
  const in30 = addDays(todayIsoDate(), 30)
  const [tasks, docs, controls] = await Promise.all([
    user.positionId
      ? s.supabase
          .from("tasks")
          .select("due_date")
          .eq("organization_id", s.org)
          .eq("assignee_position_id", user.positionId)
          .eq("status", "pendiente")
          .then((r) => r.data ?? [])
      : [],
    s.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", s.org)
      .eq("status", "vigente")
      .lte("next_review_date", in30)
      .then((r) => r.count ?? 0),
    riskRole && user.positionId
      ? s.supabase
          .from("controls")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", s.org)
          .eq("responsible_position_id", user.positionId)
          .lte("next_due_date", in30)
          .then((r) => r.count ?? 0)
      : 0,
  ])
  return {
    pendingTasks: tasks.length,
    overdueTasks: tasks.filter((t) => daysFromToday(t.due_date) < 0).length,
    documentsDueForReview30d: docs,
    pendingControls: riskRole ? controls : null,
  }
}

export async function getSetupProgress(): Promise<SetupProgress> {
  const s = await scope()
  if (!s) return { hasProcesses: false, hasPositionsWithRoles: false, hasInvitedUsers: false }
  const count = (t: "processes" | "position_roles" | "invitations") =>
    s.supabase
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", s.org)
      .then((r) => (r.count ?? 0) > 0)
  const [hasProcesses, hasPositionsWithRoles, hasInvitedUsers] = await Promise.all([
    count("processes"),
    count("position_roles"),
    count("invitations"),
  ])
  return { hasProcesses, hasPositionsWithRoles, hasInvitedUsers }
}

const ACTIVITY_VERBS: Record<string, string> = {
  registrar_documento: "registró",
  adjuntar_archivos: "adjuntó archivos a",
  enviar_revision: "envió a revisión",
  devolver: "devolvió con comentarios",
  rechazar: "rechazó",
  firmar_revision: "firmó la revisión de",
  firmar_aprobacion: "aprobó",
  confirmar_lectura: "confirmó la lectura de",
  solicitar_actualizacion: "solicitó actualizar",
  aceptar_solicitud: "aceptó la solicitud de cambio de",
  rechazar_solicitud: "rechazó la solicitud de cambio de",
  identificar_riesgo: "identificó el riesgo",
  valorar_riesgo: "valoró",
  agregar_control: "agregó un control a",
  registrar_evidencia: "registró evidencia en",
  invitar_usuario: "invitó a",
  aceptar_invitacion: "se unió como",
  revocar_acceso: "revocó el acceso de",
  recertificar_accesos: "recertificó accesos",
}

/** Actividad reciente (la auditoría solo la leen Admin, Líder SIG y Auditor; el resto ve vacío). */
export async function getRecentActivity(limit = 5): Promise<ActivityEvent[]> {
  const s = await scope()
  if (!s) return []
  const { data } = await s.supabase
    .from("audit_log")
    .select("id, actor_id, action, entity_label, at")
    .eq("organization_id", s.org)
    .order("at", { ascending: false })
    .limit(limit)
  const rows = data ?? []
  const person = await peopleOf(s.org, rows.map((r) => r.actor_id))
  return rows.map((r) => ({
    id: String(r.id),
    actorName: r.actor_id ? person(r.actor_id).fullName : "Sistema",
    description: ACTIVITY_VERBS[r.action] ?? r.action.replaceAll("_", " "),
    entityCode: r.entity_label ? r.entity_label.split(" ")[0] : null,
    at: r.at,
  }))
}

// ---------- Catálogos ----------

export async function listProcesses(): Promise<Process[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: positions }, { data: docs }] = await Promise.all([
    s.supabase.from("processes").select("id, code, name, type, leader_position_id").eq("organization_id", s.org).order("code"),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("documents").select("process_id").eq("organization_id", s.org),
  ])
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type as ProcessType,
    leaderPositionId: p.leader_position_id,
    leaderPositionName: p.leader_position_id ? posName.get(p.leader_position_id) ?? null : null,
    documentCount: (docs ?? []).filter((d) => d.process_id === p.id).length,
  }))
}

export async function listDocumentTypes(): Promise<DocumentType[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: docs }] = await Promise.all([
    s.supabase.from("document_types").select("id, code, name").eq("organization_id", s.org).order("code"),
    s.supabase.from("documents").select("type_id").eq("organization_id", s.org),
  ])
  return (rows ?? []).map((t) => ({
    ...t,
    documentCount: (docs ?? []).filter((d) => d.type_id === t.id).length,
  }))
}

export async function listPositions(): Promise<Position[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: roles }, { data: processes }, dir] = await Promise.all([
    s.supabase.from("positions").select("id, name, process_id").eq("organization_id", s.org).order("name"),
    s.supabase.from("position_roles").select("position_id, role, process_id").eq("organization_id", s.org),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
    getDirectory(s.org),
  ])
  const procName = new Map((processes ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    processId: p.process_id,
    processName: p.process_id ? procName.get(p.process_id) ?? null : null,
    roles: (roles ?? []).filter((r) => r.position_id === p.id).map((r) => ({ role: r.role as Role, processId: r.process_id })),
    holders: [...dir.entries()]
      .filter(([, d]) => d.positionId === p.id)
      .map(([id, d]) => ({ id, fullName: d.fullName, positionName: p.name })),
  }))
}

// ---------- Documentos ----------

type DocRow = {
  id: string
  code: string
  title: string
  status: string
  process_id: string
  type_id: string
  next_review_date: string | null
  current_version_id: string | null
}

const DOC_COLUMNS = "id, code, title, status, process_id, type_id, next_review_date, current_version_id"

/** Nombres de proceso/tipo y número de versión vigente (o la última si no hay vigente). */
async function toSummaries(s: NonNullable<Awaited<ReturnType<typeof scope>>>, rows: DocRow[]): Promise<DocumentSummary[]> {
  if (!rows.length) return []
  const today = todayIsoDate()
  const [{ data: processes }, { data: types }, { data: versions }] = await Promise.all([
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
    s.supabase.from("document_types").select("id, code").eq("organization_id", s.org),
    s.supabase.from("document_versions").select("id, document_id, version_no").in("document_id", rows.map((d) => d.id)),
  ])
  const procName = new Map((processes ?? []).map((p) => [p.id, p.name]))
  const typeCode = new Map((types ?? []).map((t) => [t.id, t.code]))
  return rows.map((d) => {
    const own = (versions ?? []).filter((v) => v.document_id === d.id)
    const current = own.find((v) => v.id === d.current_version_id)
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      processId: d.process_id,
      processName: procName.get(d.process_id) ?? "",
      typeId: d.type_id,
      typeCode: typeCode.get(d.type_id) ?? "",
      status: d.status as DocumentStatus,
      currentVersionNo: current?.version_no ?? Math.max(1, ...own.map((v) => v.version_no)),
      nextReviewDate: dateOnlyOrNull(d.next_review_date),
      reviewOverdue: d.status === "vigente" && !!d.next_review_date && d.next_review_date < today,
    }
  })
}

/** Texto de búsqueda seguro para el filtro `or` de PostgREST. */
const searchTerm = (q?: string) => q?.replace(/[%,()"\\*]/g, " ").trim() ?? ""

function documentQuery(s: NonNullable<Awaited<ReturnType<typeof scope>>>, f: DocumentFilters, count = false) {
  let q = s.supabase
    .from("documents")
    .select(DOC_COLUMNS, count ? { count: "exact" } : undefined)
    .eq("organization_id", s.org)
  const t = searchTerm(f.q)
  if (t) q = q.or(`code.ilike."%${t}%",title.ilike."%${t}%"`)
  if (f.processId && isUuid(f.processId)) q = q.eq("process_id", f.processId)
  if (f.typeId && isUuid(f.typeId)) q = q.eq("type_id", f.typeId)
  if (f.statuses?.length) q = q.in("status", f.statuses)
  if (f.reviewOverdue) q = q.eq("status", "vigente").lt("next_review_date", todayIsoDate())
  const column = f.sort === "title" ? "title" : f.sort === "nextReview" ? "next_review_date" : "code"
  return q.order(column, { ascending: f.dir !== "desc", nullsFirst: false }).order("code")
}

export async function listDocuments(f: DocumentFilters): Promise<Paginated<DocumentSummary>> {
  const page = Math.max(1, f.page ?? 1)
  const s = await scope()
  if (!s) return { items: [], total: 0, page, pageSize: PAGE_SIZE }
  const { data, count, error } = await documentQuery(s, f, true).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  return { items: await toSummaries(s, data ?? []), total: count ?? 0, page, pageSize: PAGE_SIZE }
}

/** Todas las filas filtradas, sin paginar (exportación CSV). */
export async function listAllDocuments(f: DocumentFilters): Promise<DocumentSummary[]> {
  const s = await scope()
  if (!s) return []
  const { data, error } = await documentQuery(s, f).limit(5000)
  if (error) throw new Error(error.message)
  return toSummaries(s, data ?? [])
}

export async function searchDocuments(q: string, limit = 8): Promise<DocumentSummary[]> {
  if (!searchTerm(q)) return []
  const s = await scope()
  if (!s) return []
  const { data } = await documentQuery(s, { q }).limit(limit)
  return toSummaries(s, data ?? [])
}

export async function getDocument(id: string, user: CurrentUser): Promise<DocumentDetail | null> {
  const s = await scope()
  if (!s || !isUuid(id)) return null
  const { data: d } = await s.supabase.from("documents").select("*").eq("id", id).maybeSingle()
  if (!d) return null

  const [{ data: versions }, { data: distribution }, { data: requests }, { data: positions }, { data: type }] =
    await Promise.all([
      s.supabase.from("document_versions").select("*").eq("document_id", id).order("version_no", { ascending: false }),
      s.supabase.from("document_distribution").select("position_id").eq("document_id", id),
      s.supabase.from("change_requests").select("*").eq("document_id", id).order("created_at", { ascending: false }),
      s.supabase.from("positions").select("id, name").eq("organization_id", d.organization_id),
      s.supabase.from("document_types").select("name").eq("id", d.type_id).maybeSingle(),
    ])
  const vs = versions ?? []
  const vIds = vs.map((v) => v.id)
  const [{ data: comments }, { data: signatures }, { data: reads }] = vIds.length
    ? await Promise.all([
        s.supabase.from("review_comments").select("*").in("version_id", vIds).order("created_at"),
        s.supabase.from("signatures").select("*").in("version_id", vIds).order("signed_at"),
        s.supabase.from("read_acknowledgements").select("version_id, user_id, acknowledged_at").in("version_id", vIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const distIds = (distribution ?? []).map((x) => x.position_id)
  const dir = await getDirectory(d.organization_id)
  const person = await peopleOf(d.organization_id, [
    ...vs.flatMap((v) => [v.elaborated_by, v.reviewed_by, v.approved_by]),
    ...(comments ?? []).map((c) => c.author_id),
    ...(signatures ?? []).map((x) => x.signer_id),
    ...(requests ?? []).flatMap((r) => [r.requested_by, r.resolved_by]),
  ])
  const [summary] = await toSummaries(s, [d])
  const showContent = !isMetadataOnly(user)

  const signed = async (path: string | null, download?: string) => {
    if (!showContent || !path) return null
    const { data } = await s.supabase.storage
      .from("documentos")
      .createSignedUrl(path, SIGNED_URL_SECONDS, download ? { download } : undefined)
    return data?.signedUrl ?? null
  }

  const docVersions: DocumentVersion[] = await Promise.all(
    vs.map(async (v) => {
      const approved = v.status === "aprobada" || v.status === "reemplazada"
      const readers = approved
        ? [...dir.entries()].filter(([, m]) => m.positionId && distIds.includes(m.positionId))
        : []
      return {
        id: v.id,
        versionNo: v.version_no,
        status: v.status as VersionStatus,
        changeSummary: v.change_summary,
        pdfUrl: await signed(v.pdf_path),
        sourceUrl: await signed(v.source_path, v.source_file_name ?? undefined),
        sourceFileName: v.source_file_name ?? "",
        pdfSha256: v.pdf_sha256 ?? "",
        pageCount: 0,
        elaboratedBy: person(v.elaborated_by),
        reviewedBy: v.reviewed_by ? person(v.reviewed_by) : null,
        approvedBy: v.approved_by ? person(v.approved_by) : null,
        approvedAt: v.approved_at,
        effectiveDate: dateOnlyOrNull(v.effective_date),
        comments: (comments ?? [])
          .filter((c) => c.version_id === v.id)
          .map((c) => ({ id: c.id, author: person(c.author_id), body: c.body, createdAt: c.created_at, resolvedAt: c.resolved_at })),
        signatures: (signatures ?? [])
          .filter((x) => x.version_id === v.id)
          .map((x) => ({
            id: x.id,
            signer: person(x.signer_id),
            action: x.action as "revision" | "aprobacion",
            meaning: x.meaning,
            signedAt: x.signed_at,
            ip: x.ip ? String(x.ip) : "",
            signatureHash: x.signature_hash,
          })),
        reads: readers.map(([userId, m]) => ({
          userId,
          userName: m.fullName,
          positionName: m.positionName,
          acknowledgedAt: (reads ?? []).find((r) => r.version_id === v.id && r.user_id === userId)?.acknowledged_at ?? null,
        })),
      }
    })
  )

  const changeRequests: ChangeRequest[] = (requests ?? []).map((r) => ({
    id: r.id,
    requestedBy: person(r.requested_by),
    reason: r.reason,
    status: r.status as ChangeRequest["status"],
    createdAt: r.created_at,
    resolvedBy: r.resolved_by ? person(r.resolved_by) : null,
    resolution: r.resolution,
  }))

  return {
    ...summary,
    typeName: type?.name ?? "",
    elaboradorPositionId: d.elaborador_position_id,
    elaboradorPositionName: posName.get(d.elaborador_position_id) ?? "",
    revisorPositionId: d.revisor_position_id,
    revisorPositionName: posName.get(d.revisor_position_id) ?? "",
    aprobadorPositionId: d.aprobador_position_id,
    aprobadorPositionName: posName.get(d.aprobador_position_id) ?? "",
    reviewEveryMonths: d.review_every_months,
    readRequired: d.read_required,
    distributionPositionIds: distIds,
    distributionCount: distIds.length,
    versions: docVersions,
    changeRequests,
  }
}

// ---------- Riesgos ----------

/** Todos los riesgos visibles de la organización con historial y controles (volumen bajo por org). */
const loadRisks = cache(async (): Promise<Risk[]> => {
  const s = await scope()
  if (!s) return []
  const [{ data: risks }, { data: assessments }, { data: controls }, { data: evidences }, { data: processes }, { data: positions }] =
    await Promise.all([
      s.supabase.from("risks").select("*").eq("organization_id", s.org),
      s.supabase.from("risk_assessments").select("*").eq("organization_id", s.org).order("assessed_at", { ascending: false }),
      s.supabase.from("controls").select("*").eq("organization_id", s.org).order("created_at"),
      s.supabase
        .from("control_evidences")
        .select("id, control_id, executed_at, result, notes, file_name, registered_by, created_at")
        .eq("organization_id", s.org)
        .order("executed_at", { ascending: false })
        .order("created_at", { ascending: false }),
      s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
      s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    ])
  if (!risks?.length) return []
  const today = todayIsoDate()
  const procName = new Map((processes ?? []).map((p) => [p.id, p.name]))
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const person = await peopleOf(s.org, [
    ...(assessments ?? []).map((a) => a.assessed_by),
    ...(evidences ?? []).map((e) => e.registered_by),
  ])

  return risks.map((r) => {
    const history = (assessments ?? [])
      .filter((a) => a.risk_id === r.id)
      .map((a) => ({
        id: a.id,
        kind: a.kind as AssessmentKind,
        probability: a.probability,
        impact: a.impact,
        score: a.score ?? a.probability * a.impact,
        level: a.level as RiskLevel,
        assessedBy: person(a.assessed_by),
        assessedAt: a.assessed_at,
      }))
    const inherent = history.find((a) => a.kind === "inherente")
    const residual = history.find((a) => a.kind === "residual")
    const own: Control[] = (controls ?? [])
      .filter((c) => c.risk_id === r.id)
      .map((c) => {
        const ev = (evidences ?? []).find((e) => e.control_id === c.id)
        return {
          id: c.id,
          description: c.description,
          type: c.type as Control["type"],
          frequency: CONTROL_FREQUENCY_LABELS[c.frequency] ?? c.frequency,
          responsiblePositionId: c.responsible_position_id,
          responsiblePositionName: posName.get(c.responsible_position_id) ?? "",
          nextDueDate: dateOnly(c.next_due_date),
          overdue: c.next_due_date < today,
          lastEvidence: ev
            ? {
                id: ev.id,
                executedAt: dateOnly(ev.executed_at),
                result: ev.result as "efectivo" | "no_efectivo",
                notes: ev.notes,
                fileName: ev.file_name,
                registeredBy: person(ev.registered_by),
              }
            : null,
        }
      })
    return {
      id: r.id,
      code: r.code,
      description: r.description,
      processId: r.process_id,
      processName: procName.get(r.process_id) ?? "",
      category: r.category,
      inherent: inherent ? { score: inherent.score, level: inherent.level } : { score: 0, level: "bajo" as RiskLevel },
      residual: residual ? { score: residual.score, level: residual.level } : null,
      controlCount: own.length,
      overdueControlCount: own.filter((c) => c.overdue).length,
      cause: r.cause,
      consequence: r.consequence,
      ownerPositionName: posName.get(r.owner_position_id) ?? "",
      status: r.status as Risk["status"],
      assessments: history,
      controls: own,
    }
  })
})

function assessmentOf(r: RiskSummaryRow, kind: AssessmentKind) {
  return kind === "inherente" ? r.inherent : r.residual ?? r.inherent
}

function filterRisks(all: Risk[], f: RiskFilters): Risk[] {
  const q = f.q?.trim().toLocaleLowerCase("es")
  const kind = f.kind ?? "residual"
  return all.filter((r) => {
    const a = assessmentOf(r, kind)
    const cellOk = (() => {
      if (!f.cell) return true
      const [p, i] = f.cell.split("-").map(Number)
      const full = r.assessments.find((x) => x.kind === kind) ?? r.assessments.find((x) => x.kind === "inherente")
      return full?.probability === p && full?.impact === i
    })()
    return (
      (!q || r.code.toLocaleLowerCase("es").includes(q) || r.description.toLocaleLowerCase("es").includes(q)) &&
      (!f.processId || r.processId === f.processId) &&
      (!f.category || r.category === f.category) &&
      (!f.level || a.level === f.level) &&
      (!f.overdueControls || r.overdueControlCount > 0) &&
      cellOk
    )
  })
}

export async function listRisks(f: RiskFilters & { page?: number }): Promise<Paginated<RiskSummaryRow>> {
  const kind = f.kind ?? "residual"
  const dir = (f.dir ?? (f.sort && f.sort !== "level" ? "asc" : "desc")) === "desc" ? -1 : 1
  const compare = (a: RiskSummaryRow, b: RiskSummaryRow) =>
    f.sort === "code"
      ? a.code.localeCompare(b.code, "es", { numeric: true })
      : f.sort === "process"
        ? a.processName.localeCompare(b.processName, "es")
        : assessmentOf(a, kind).score - assessmentOf(b, kind).score
  const rows = filterRisks(await loadRisks(), f).sort(
    (a, b) => compare(a, b) * dir || a.code.localeCompare(b.code, "es", { numeric: true })
  )
  const page = Math.max(1, f.page ?? 1)
  const items: RiskSummaryRow[] = rows
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ cause: _c, consequence: _q, ownerPositionName: _o, status: _s, assessments: _a, controls: _k, ...row }) => row)
  return { items, total: rows.length, page, pageSize: PAGE_SIZE }
}

export async function listRiskCategories(): Promise<string[]> {
  return [...new Set((await loadRisks()).map((r) => r.category))].sort((a, b) => a.localeCompare(b, "es"))
}

/** Matriz P×I con los filtros de proceso y categoría (no se filtra por celda ni nivel). */
export async function getRiskMatrix(f: RiskFilters): Promise<RiskMatrix> {
  const kind = f.kind ?? "residual"
  const rows = filterRisks(await loadRisks(), { processId: f.processId, category: f.category, kind })
  const counts = Array.from({ length: 5 }, () => Array<number>(5).fill(0))
  const byLevel = Object.fromEntries(RISK_LEVELS.map((l) => [l, 0])) as Record<RiskLevel, number>
  let total = 0
  for (const r of rows) {
    const a = r.assessments.find((x) => x.kind === kind) ?? r.assessments.find((x) => x.kind === "inherente")
    if (!a) continue
    counts[a.probability - 1][a.impact - 1]++
    byLevel[a.level]++
    total++
  }
  const controls = rows.flatMap((r) => r.controls)
  const onTime = controls.filter((c) => !c.overdue).length
  return {
    kind,
    counts,
    total,
    byLevel,
    controlsOnTimePct: controls.length ? Math.round((onTime / controls.length) * 100) : 0,
  }
}

export async function getRisk(id: string): Promise<Risk | null> {
  if (!isUuid(id)) return null
  return (await loadRisks()).find((r) => r.id === id) ?? null
}

/** Todas las filas filtradas, sin paginar (exportación CSV de la matriz). */
export async function listAllRisks(f: RiskFilters): Promise<Risk[]> {
  return filterRisks(await loadRisks(), f)
}

// ---------- Administración ----------

export async function listMembers(): Promise<Member[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: memberships }, { data: invitations }, { data: positions }] = await Promise.all([
    s.supabase.from("memberships").select("*").eq("organization_id", s.org),
    s.supabase.from("invitations").select("*").eq("organization_id", s.org).is("accepted_at", null),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
  ])
  const ms = memberships ?? []
  const { data: profiles } = ms.length
    ? await s.supabase.from("profiles").select("id, full_name, email").in("id", ms.map((m) => m.user_id))
    : { data: [] }
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const today = todayIsoDate()

  const members: Member[] = ms.map((m) => {
    const p = (profiles ?? []).find((x) => x.id === m.user_id)
    return {
      membershipId: m.id,
      userId: m.user_id,
      fullName: p?.full_name || null,
      email: p?.email ?? "",
      positionId: m.position_id ?? "",
      positionName: m.position_id ? posName.get(m.position_id) ?? "" : "Sin cargo",
      isOrgAdmin: m.is_org_admin,
      isExternal: m.is_external,
      validUntil: dateOnlyOrNull(m.valid_until),
      status: m.status === "revocado" ? "revocado" : m.valid_until && m.valid_until < today ? "vencido" : "activo",
      invitedAt: null,
    }
  })
  const invited: Member[] = (invitations ?? [])
    .filter((i) => !ms.some((m) => (profiles ?? []).find((p) => p.id === m.user_id)?.email === i.email))
    .map((i) => ({
      membershipId: `inv_${i.id}`,
      userId: null,
      fullName: null,
      email: i.email,
      positionId: i.position_id,
      positionName: posName.get(i.position_id) ?? "",
      isOrgAdmin: i.is_org_admin,
      isExternal: i.is_external,
      validUntil: dateOnlyOrNull(i.valid_until),
      status: "invitado",
      invitedAt: i.created_at,
    }))
  return [...members, ...invited].sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "es"))
}

export async function getRecertification(): Promise<RecertificationInfo> {
  const s = await scope()
  if (!s) return { periodDays: 180, nextDueDate: new Date().toISOString(), items: [] }
  const [{ data: org }, { data: last }, members] = await Promise.all([
    s.supabase.from("organizations").select("recert_period_days, created_at").eq("id", s.org).single(),
    s.supabase.from("access_recertifications").select("at").eq("organization_id", s.org).order("at", { ascending: false }).limit(1),
    s.supabase.from("memberships").select("*").eq("organization_id", s.org).eq("status", "activo"),
  ])
  const period = org?.recert_period_days ?? 180
  const plus = (iso: string) => new Date(new Date(iso).getTime() + period * 86_400_000).toISOString()
  const base = last?.[0]?.at ?? org?.created_at ?? new Date().toISOString()
  const ms = members.data ?? []
  const [{ data: profiles }, { data: positions }] = await Promise.all([
    ms.length ? s.supabase.from("profiles").select("id, full_name, email").in("id", ms.map((m) => m.user_id)) : { data: [] },
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
  ])
  const items = ms
    .map((m) => {
      const p = (profiles ?? []).find((x) => x.id === m.user_id)
      const due = plus(m.last_recertified_at ?? m.created_at)
      return {
        membershipId: m.id,
        fullName: p?.full_name || p?.email || "",
        email: p?.email ?? "",
        positionName: (positions ?? []).find((x) => x.id === m.position_id)?.name ?? "Sin cargo",
        isExternal: m.is_external,
        lastRecertifiedAt: m.last_recertified_at,
        dueDate: due,
        overdue: daysFromToday(due) < 0,
      }
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return { periodDays: period, nextDueDate: plus(base), items }
}

/** Normaliza el diff guardado por log_event a { campo: { before, after } }. */
function normalizeDiff(diff: unknown): AuditEntry["diff"] {
  if (!diff || typeof diff !== "object") return {}
  return Object.fromEntries(
    Object.entries(diff as Record<string, unknown>).map(([k, v]) => {
      if (v && typeof v === "object" && ("before" in v || "after" in v)) {
        const o = v as { before?: unknown; after?: unknown }
        return [k, { before: o.before == null ? null : String(o.before), after: o.after == null ? null : String(o.after) }]
      }
      return [k, { before: null, after: v == null ? null : typeof v === "object" ? JSON.stringify(v) : String(v) }]
    })
  )
}

export async function listAuditLog(f: AuditFilters): Promise<AuditEntry[]> {
  const s = await scope()
  if (!s) return []
  let q = s.supabase
    .from("audit_log")
    .select("id, at, actor_id, action, entity_type, entity_label, diff")
    .eq("organization_id", s.org)
  if (f.from) q = q.gte("at", `${f.from}T00:00:00-05:00`)
  if (f.to) q = q.lte("at", `${f.to}T23:59:59.999-05:00`)
  if (f.action) q = q.eq("action", f.action)
  if (f.entityType) q = q.eq("entity_type", f.entityType)
  const { data } = await q.order("at", { ascending: false }).limit(2000)
  const rows = data ?? []
  const person = await peopleOf(s.org, rows.map((r) => r.actor_id))
  return rows
    .map((r) => ({
      id: String(r.id),
      at: r.at,
      actorName: r.actor_id ? person(r.actor_id).fullName : "Sistema",
      action: r.action,
      entityType: r.entity_type,
      entityLabel: r.entity_label,
      diff: normalizeDiff(r.diff),
    }))
    .filter((e) => !f.actor || e.actorName === f.actor)
}

/** Solo Superadmin (la RLS devuelve únicamente las organizaciones propias al resto). */
export async function listOrganizations(): Promise<Organization[]> {
  const user = await getCurrentUser()
  if (!user.isPlatformAdmin) return []
  const supabase = await createClient()
  const [{ data: orgs }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("id, name, nit, status, created_at").order("name"),
    supabase.from("memberships").select("organization_id").eq("status", "activo"),
  ])
  return (orgs ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    nit: o.nit,
    status: o.status as Organization["status"],
    userCount: (members ?? []).filter((m) => m.organization_id === o.id).length,
    createdAt: o.created_at,
  }))
}

/** Invitación por token (página pública): se busca por su hash con la clave de servidor. */
export async function getInvitation(token: string): Promise<Invitation | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null
  const admin = createAdminClient()
  const { data: inv } = await admin.from("invitations").select("*").eq("token_hash", sha256Hex(token)).maybeSingle()
  if (!inv) return null
  const [{ data: org }, { data: pos }, { data: account }] = await Promise.all([
    admin.from("organizations").select("name, status").eq("id", inv.organization_id).single(),
    admin.from("positions").select("name").eq("id", inv.position_id).single(),
    admin.from("profiles").select("id").eq("email", inv.email).maybeSingle(),
  ])
  const expired = new Date(inv.expires_at) < new Date() || org?.status !== "activa"
  return {
    organizationName: org?.name ?? "",
    positionName: pos?.name ?? "",
    email: inv.email,
    isExternal: inv.is_external,
    validUntil: dateOnlyOrNull(inv.valid_until),
    status: inv.accepted_at ? "usada" : expired ? "vencida" : "valida",
    accountExists: !!account,
  }
}
