// Acceso a datos de lectura (servidor). Cada función consulta Supabase con la sesión del
// usuario: la RLS decide qué filas ve. Devuelven exactamente los tipos de vista de
// src/lib/types.ts; la UI no conoce el esquema.

import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { currentPeriod, monthlyLimit } from "@/lib/agente/limits"
import { canAddFindings, canFillForms, canManageAudits, canManageCompetencies, canManageEnv, canManageForms, canManageHazards, canManageIndicators, canManageLegal, canManageMinutes, canManageNonconformities, canManageObjectives, canManagePqrs, canManageReviews, canManageSst, canManageSuppliers, canMeasureIndicator, canSeeSignatureIp } from "@/lib/domain/access"
import { isMetadataOnly } from "@/lib/domain/documents"
import { CONTROL_FREQUENCY_LABELS, RISK_LEVELS } from "@/lib/domain/risk"
import { daysFromToday, todayIsoDate } from "@/lib/format"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { sha256Hex } from "@/lib/data/hash"
import type {
  ActivityEvent,
  AssessedLevel,
  AssessmentKind,
  AuditDetail,
  AuditEntry,
  AuditFilters,
  AuditFindingView,
  AuditListItem,
  AuditStatus,
  AuditSummary,
  FindingSeverity,
  FindingType,
  ChangeRequest,
  Control,
  CurrentUser,
  DocumentDetail,
  DocumentFilters,
  DocumentStatus,
  DocumentSummary,
  DocumentType,
  DocumentVersion,
  ComplianceStatus,
  CompetencyKind,
  CompetencyListItem,
  CompetencyMatrix,
  CompetencyStatus,
  CompetencySummary,
  MatrixRow,
  PersonCompetencyDetail,
  PersonCompetencyRow,
  PositionProfileDetail,
  PositionRequirement,
  TrainingAttendeeView,
  TrainingListItem,
  TrainingResult,
  HomeSummary,
  IndicatorDetail,
  IndicatorDirection,
  IndicatorFrequency,
  IndicatorListItem,
  IndicatorMeasurementView,
  IndicatorStatus,
  IndicatorSummary,
  TrendPoint,
  Invitation,
  Member,
  ReviewDetail,
  ReviewInputs,
  ReviewListItem,
  ReviewOutputKind,
  ReviewOutputView,
  ReviewSnapshot,
  ReviewStatus,
  NcActionStatus,
  NcActionType,
  NcActionView,
  NcDetail,
  NcListItem,
  NcSeverity,
  NcSource,
  NcStatus,
  NcSummary,
  CommitmentView,
  DashboardData,
  DashboardFilters,
  EnvAspectDetail,
  EnvAspectListItem,
  EnvAspectsSummary,
  HazardDetail,
  HazardListItem,
  HazardsSummary,
  Norm,
  NormOption,
  LegalEvaluationView,
  LegalRequirementDetail,
  LegalRequirementListItem,
  LegalSummary,
  MinuteDetail,
  MinuteListItem,
  MinutesSummary,
  ObjectiveCardView,
  Perspective,
  PublicSurvey,
  SurveyCampaign,
  ObjectiveIndicatorRef,
  Organization,
  Paginated,
  PersonRef,
  Position,
  PqrsDetail,
  PqrsListItem,
  PqrsSummary,
  SatisfactionMeasurementView,
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
  SupplierDetail,
  SupplierEvaluationView,
  SupplierListItem,
  SupplierSummary,
  Task,
  TaskType,
  VersionStatus,
  FormCategory,
  FormStatus,
  FormFieldView,
  FormTemplateListItem,
  FormsSummary,
  FormTemplateDetail,
  PublishedForm,
  SubmissionListItem,
  SubmissionDetail,
  SubmissionStatus,
  FieldValue,
  SstSummary,
  SstEvaluationListItem,
  SstEvaluationDetail,
  SstItemView,
  SstPhaseTotal,
  SstActionView,
  SstCycle,
  SstRating,
  SstEvaluationStatus,
  SstItemStatus,
  SstComponent,
  SstActionStatus,
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

  const [{ data: profile }, { data: memberships }, { data: isPlatformAccount }, { data: orgs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, active_org").eq("id", uid).maybeSingle(),
    supabase
      .from("memberships")
      .select("organization_id, position_id, is_org_admin, is_external, valid_from, valid_until, status")
      .eq("user_id", uid),
    supabase.rpc("is_platform_admin_account"),
    supabase.from("organizations").select("id, name, status").order("name"),
  ])
  // La cuenta Superadmin siempre entra con segundo factor; sin él la base no le da privilegios.
  if (isPlatformAccount && auth.claims.aal !== "aal2") redirect("/mfa")
  const isPlatformAdmin = !!isPlatformAccount
  const email = String(auth.claims.email ?? "")

  const today = todayIsoDate()
  const valid = (memberships ?? []).filter(
    (m) => m.status === "activo" && m.valid_from <= today && (!m.valid_until || m.valid_until >= today)
  )
  const available = (orgs ?? []).filter((o) => o.status === "activa" && valid.some((m) => m.organization_id === o.id))
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
    fullName: profile.full_name || email,
    email,
    positionId: m?.position_id ?? null,
    positionName,
    organization: { id: org.id, name: org.name },
    organizations: available.map((o) => ({ id: o.id, name: o.name })),
    isOrgAdmin: m?.is_org_admin ?? false,
    isPlatformAdmin,
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

/** Opt-in de Crubol-Agent para la organización activa (lo enciende el Superadmin; default apagado). */
export async function isAgentEnabled(): Promise<boolean> {
  const s = await scope()
  if (!s) return false
  const { data } = await s.supabase
    .from("organizations")
    .select("ai_agent_enabled")
    .eq("id", s.org)
    .maybeSingle()
  return data?.ai_agent_enabled ?? false
}

/** Uso del agente en el período actual para la organización activa. null si no hay sesión.
 * La RLS (`ai_usage_select`) solo deja leer a quien administra el catálogo. */
export async function getAgentUsage(): Promise<{ used: number; limit: number; remaining: number } | null> {
  const s = await scope()
  if (!s) return null
  const { data } = await s.supabase
    .from("ai_agent_usage")
    .select("used")
    .eq("organization_id", s.org)
    .eq("period", currentPeriod())
    .maybeSingle()
  const used = data?.used ?? 0
  const limit = monthlyLimit()
  return { used, limit, remaining: Math.max(0, limit - used) }
}

// ---------- No Conformidades / CAPA ----------

const isActionOverdue = (status: string, due: string, today: string) =>
  (status === "pendiente" || status === "en_curso") && due < today

/** Tablero de no conformidades (RLS filtra lo visible). */
export async function listNonconformities(): Promise<NcListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: ncs }, { data: procs }, { data: acts }] = await Promise.all([
    s.supabase
      .from("nonconformities")
      .select("id, code, title, process_id, source, severity, status, reopened_count, detected_at")
      .eq("organization_id", s.org)
      .order("created_at", { ascending: false }),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("nc_actions").select("nonconformity_id, due_date, status").eq("organization_id", s.org),
  ])
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const today = todayIsoDate()
  const overdue = new Map<string, number>()
  for (const a of acts ?? []) {
    if (isActionOverdue(a.status, a.due_date, today)) overdue.set(a.nonconformity_id, (overdue.get(a.nonconformity_id) ?? 0) + 1)
  }
  return (ncs ?? []).map((n) => ({
    id: n.id,
    code: n.code,
    title: n.title,
    processName: n.process_id ? procCode.get(n.process_id) ?? null : null,
    source: n.source as NcSource,
    severity: n.severity as NcSeverity,
    status: n.status as NcStatus,
    reopened: n.reopened_count > 0,
    overdueActions: overdue.get(n.id) ?? 0,
    detectedAt: n.detected_at,
  }))
}

/** Resumen del tablero: abiertas, en verificación, acciones vencidas y severidad de las abiertas. */
export async function getNcSummary(): Promise<NcSummary> {
  const empty: NcSummary = { open: 0, inVerification: 0, overdueActions: 0, bySeverity: { observacion: 0, menor: 0, mayor: 0 } }
  const s = await scope()
  if (!s) return empty
  const [{ data: ncs }, { data: acts }] = await Promise.all([
    s.supabase.from("nonconformities").select("status, severity").eq("organization_id", s.org),
    s.supabase.from("nc_actions").select("due_date, status").eq("organization_id", s.org),
  ])
  const today = todayIsoDate()
  const openList = (ncs ?? []).filter((n) => n.status !== "cerrada" && n.status !== "anulada")
  const bySeverity = { observacion: 0, menor: 0, mayor: 0 }
  for (const n of openList) bySeverity[n.severity as NcSeverity]++
  return {
    open: openList.length,
    inVerification: (ncs ?? []).filter((n) => n.status === "verificacion").length,
    overdueActions: (acts ?? []).filter((a) => isActionOverdue(a.status, a.due_date, today)).length,
    bySeverity,
  }
}

const NC_EVENT_TEXT: Record<string, string> = {
  reportar_nc: "Reportó la no conformidad.",
  analizar_causa_nc: "Registró el análisis de causa.",
  agregar_accion_nc: "Agregó una acción al plan.",
  completar_accion_nc: "Completó una acción.",
  cancelar_accion_nc: "Canceló una acción.",
  verificar_nc: "Verificó la eficacia.",
  anular_nc: "Anuló la no conformidad.",
  registrar_evidencia_nc: "Registró evidencia.",
}

/** Ficha completa de una no conformidad por su código. null si no existe o no es visible. */
export async function getNonconformity(code: string): Promise<NcDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: n } = await s.supabase
    .from("nonconformities")
    .select("*")
    .eq("organization_id", s.org)
    .eq("code", code)
    .maybeSingle()
  if (!n) return null

  const [{ data: acts }, { data: evs }, { data: procs }, { data: positions }, { data: audit }] = await Promise.all([
    s.supabase.from("nc_actions").select("*").eq("nonconformity_id", n.id).order("created_at"),
    s.supabase.from("nc_evidences").select("*").eq("nonconformity_id", n.id).order("registered_at"),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase
      .from("audit_log")
      .select("at, actor_id, action")
      .eq("organization_id", s.org)
      .eq("entity_type", "NoConformidad")
      .eq("entity_id", n.id)
      .order("at", { ascending: false }),
  ])

  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const person = await peopleOf(s.org, [n.reported_by, ...(acts ?? []).map((a) => a.completed_by), ...(audit ?? []).map((a) => a.actor_id)])
  const today = todayIsoDate()

  const signNc = async (path: string, name: string) => {
    const { data } = await s.supabase.storage.from("nc-evidencias").createSignedUrl(path, SIGNED_URL_SECONDS, { download: name })
    return data?.signedUrl ?? null
  }
  const evByAction = new Map<string, NcActionView["evidences"]>()
  for (const e of evs ?? []) {
    if (!e.action_id) continue
    const url = await signNc(e.file_path, e.file_name)
    const list = evByAction.get(e.action_id) ?? []
    list.push({ id: e.id, fileName: e.file_name, registeredByName: person(e.registered_by).fullName, registeredAt: e.registered_at, note: e.note, url })
    evByAction.set(e.action_id, list)
  }

  const actions: NcActionView[] = (acts ?? []).map((a) => ({
    id: a.id,
    type: a.type as NcActionType,
    description: a.description,
    responsiblePositionName: posName.get(a.responsible_position_id) ?? "—",
    dueDate: a.due_date,
    status: a.status as NcActionStatus,
    completedAt: a.completed_at,
    overdue: isActionOverdue(a.status, a.due_date, today),
    evidences: evByAction.get(a.id) ?? [],
  }))

  return {
    id: n.id,
    code: n.code,
    title: n.title,
    description: n.description,
    processName: n.process_id ? procCode.get(n.process_id) ?? null : null,
    source: n.source as NcSource,
    severity: n.severity as NcSeverity,
    status: n.status as NcStatus,
    reopenedCount: n.reopened_count,
    ownerPositionName: n.owner_position_id ? posName.get(n.owner_position_id) ?? null : null,
    reportedByName: person(n.reported_by).fullName,
    detectedAt: n.detected_at,
    rootCause: n.root_cause,
    sourceRiskCode: null,
    actions,
    verification:
      n.status === "cerrada" && n.verified_by
        ? {
            verifiedByName: person(n.verified_by).fullName,
            verifiedAt: n.verified_at ?? "",
            effective: n.effective ?? true,
            notes: n.verification_notes,
          }
        : null,
    timeline: (audit ?? []).map((a) => ({
      at: a.at,
      actor: a.actor_id ? person(a.actor_id).fullName : "Sistema",
      text: NC_EVENT_TEXT[a.action] ?? a.action,
    })),
    canManage: canManageNonconformities(s.user, n.process_id ?? undefined),
  }
}

// ---------- Auditorías internas ----------

/** Tablero de auditorías (RLS filtra lo visible). */
export async function listAudits(): Promise<AuditListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: auds }, { data: procs }, { data: positions }, { data: aprocs }, { data: finds }] = await Promise.all([
    s.supabase.from("audits").select("id, code, title, lead_auditor_position_id, planned_date, status").eq("organization_id", s.org).order("planned_date", { ascending: false }),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_processes").select("audit_id, process_id").eq("organization_id", s.org),
    s.supabase.from("audit_findings").select("audit_id").eq("organization_id", s.org),
  ])
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const procsByAudit = new Map<string, string[]>()
  for (const ap of aprocs ?? []) {
    const list = procsByAudit.get(ap.audit_id) ?? []
    const code = procCode.get(ap.process_id)
    if (code) list.push(code)
    procsByAudit.set(ap.audit_id, list)
  }
  const findCount = new Map<string, number>()
  for (const f of finds ?? []) findCount.set(f.audit_id, (findCount.get(f.audit_id) ?? 0) + 1)
  return (auds ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    processNames: (procsByAudit.get(a.id) ?? []).sort(),
    leadAuditorName: a.lead_auditor_position_id ? posName.get(a.lead_auditor_position_id) ?? null : null,
    plannedDate: a.planned_date,
    status: a.status as AuditStatus,
    findingCount: findCount.get(a.id) ?? 0,
  }))
}

export async function getAuditSummary(): Promise<AuditSummary> {
  const empty: AuditSummary = { planned: 0, inProgress: 0, closedThisYear: 0, ncFindings: 0 }
  const s = await scope()
  if (!s) return empty
  const [{ data: auds }, { data: finds }] = await Promise.all([
    s.supabase.from("audits").select("status, planned_date").eq("organization_id", s.org),
    s.supabase.from("audit_findings").select("type").eq("organization_id", s.org),
  ])
  const year = String(new Date().getFullYear())
  return {
    planned: (auds ?? []).filter((a) => a.status === "planificada").length,
    inProgress: (auds ?? []).filter((a) => a.status === "en_ejecucion").length,
    closedThisYear: (auds ?? []).filter((a) => a.status === "cerrada" && a.planned_date.slice(0, 4) === year).length,
    ncFindings: (finds ?? []).filter((f) => f.type === "no_conformidad").length,
  }
}

const AUDIT_EVENT_TEXT: Record<string, string> = {
  planificar_auditoria: "Planificó la auditoría.",
  iniciar_auditoria: "Inició la auditoría.",
  agregar_hallazgo: "Agregó un hallazgo.",
  generar_nc_hallazgo: "Generó una no conformidad desde un hallazgo.",
  cerrar_auditoria: "Cerró la auditoría.",
  cancelar_auditoria: "Canceló la auditoría.",
}

/** Ficha completa de una auditoría por su código. null si no existe o no es visible. */
export async function getAudit(code: string): Promise<AuditDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: a } = await s.supabase.from("audits").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!a) return null

  const [{ data: aprocs }, { data: finds }, { data: procs }, { data: positions }, { data: audit }] = await Promise.all([
    s.supabase.from("audit_processes").select("process_id").eq("audit_id", a.id),
    s.supabase.from("audit_findings").select("*").eq("audit_id", a.id).order("created_at"),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Auditoria").eq("entity_id", a.id).order("at", { ascending: false }),
  ])
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const ncIds = (finds ?? []).map((f) => f.nonconformity_id).filter((x): x is string => !!x)
  const { data: ncs } = ncIds.length
    ? await s.supabase.from("nonconformities").select("id, code").in("id", ncIds)
    : { data: [] as { id: string; code: string }[] }
  const ncCode = new Map((ncs ?? []).map((n) => [n.id, n.code]))
  const person = await peopleOf(s.org, (audit ?? []).map((x) => x.actor_id))

  const findings: AuditFindingView[] = (finds ?? []).map((f) => ({
    id: f.id,
    type: f.type as FindingType,
    severity: (f.severity as FindingSeverity | null) ?? null,
    processName: f.process_id ? procCode.get(f.process_id) ?? null : null,
    description: f.description,
    criteriaRef: f.criteria_ref,
    nonconformityCode: f.nonconformity_id ? ncCode.get(f.nonconformity_id) ?? null : null,
  }))

  return {
    id: a.id,
    code: a.code,
    title: a.title,
    objective: a.objective,
    criteria: a.criteria,
    processNames: (aprocs ?? []).map((ap) => procCode.get(ap.process_id)).filter((x): x is string => !!x).sort(),
    leadAuditorName: a.lead_auditor_position_id ? posName.get(a.lead_auditor_position_id) ?? null : null,
    plannedDate: a.planned_date,
    status: a.status as AuditStatus,
    conclusions: a.conclusions,
    findings,
    timeline: (audit ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: AUDIT_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageAudits(s.user),
    canAddFinding: canAddFindings(s.user),
  }
}

// ---------- Indicadores de gestión / KPIs (ISO 9.1) ----------

const INDICATOR_EVENT_TEXT: Record<string, string> = {
  crear_indicador: "Creó el indicador.",
  editar_indicador: "Editó la definición.",
  archivar_indicador: "Archivó el indicador.",
  reactivar_indicador: "Reactivó el indicador.",
  registrar_medicion: "Registró una medición.",
  generar_nc_medicion: "Generó una no conformidad desde una medición.",
}

/** Primer día del mes actual (ISO), el "periodo vigente" del tablero. */
function currentMonthIso(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`
}

export async function listIndicators(): Promise<IndicatorListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: inds }, { data: procs }, { data: meas }] = await Promise.all([
    s.supabase.from("indicators").select("id, code, name, process_id, unit, direction, target, target_max, frequency, status").eq("organization_id", s.org).order("code"),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("indicator_measurements").select("indicator_id, period, value, compliance").eq("organization_id", s.org).order("period"),
  ])
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const byInd = new Map<string, TrendPoint[]>()
  for (const m of meas ?? []) {
    const list = byInd.get(m.indicator_id) ?? []
    list.push({ period: m.period, value: Number(m.value), compliance: m.compliance as ComplianceStatus })
    byInd.set(m.indicator_id, list)
  }
  return (inds ?? []).map((i) => {
    const trend = byInd.get(i.id) ?? []
    const last = trend[trend.length - 1] ?? null
    return {
      id: i.id, code: i.code, name: i.name,
      processName: i.process_id ? procCode.get(i.process_id) ?? null : null,
      unit: i.unit, direction: i.direction as IndicatorDirection,
      target: Number(i.target), targetMax: i.target_max === null ? null : Number(i.target_max),
      frequency: i.frequency as IndicatorFrequency, status: i.status as IndicatorStatus,
      lastValue: last ? last.value : null,
      lastPeriod: last ? last.period : null,
      lastCompliance: last ? last.compliance : null,
      trend,
    }
  })
}

export async function getIndicatorSummary(): Promise<IndicatorSummary> {
  const empty: IndicatorSummary = { active: 0, compliancePct: null, atRisk: 0, notMeeting: 0, withoutMeasurement: 0 }
  const s = await scope()
  if (!s) return empty
  const period = currentMonthIso()
  const [{ data: inds }, { data: meas }] = await Promise.all([
    s.supabase.from("indicators").select("id, status").eq("organization_id", s.org),
    s.supabase.from("indicator_measurements").select("indicator_id, compliance").eq("organization_id", s.org).eq("period", period),
  ])
  const active = (inds ?? []).filter((i) => i.status === "activo")
  const activeIds = new Set(active.map((i) => i.id))
  const byInd = new Map((meas ?? []).filter((m) => activeIds.has(m.indicator_id)).map((m) => [m.indicator_id, m.compliance as ComplianceStatus]))
  let cumple = 0, atRisk = 0, notMeeting = 0
  for (const id of activeIds) {
    const c = byInd.get(id)
    if (c === "cumple") cumple++
    else if (c === "en_riesgo") atRisk++
    else if (c === "no_cumple") notMeeting++
  }
  const measured = byInd.size
  return {
    active: active.length,
    compliancePct: measured ? Math.round((cumple / measured) * 100) : null,
    atRisk, notMeeting,
    withoutMeasurement: active.length - measured,
  }
}

/** Ficha completa de un indicador por su código. null si no existe o no es visible. */
export async function getIndicator(code: string): Promise<IndicatorDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: i } = await s.supabase.from("indicators").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!i) return null

  const [{ data: meas }, { data: procs }, { data: positions }, { data: log }] = await Promise.all([
    s.supabase.from("indicator_measurements").select("*").eq("indicator_id", i.id).order("period", { ascending: false }),
    s.supabase.from("processes").select("id, code").eq("organization_id", s.org),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Indicador").eq("entity_id", i.id).order("at", { ascending: false }),
  ])
  const procCode = new Map((procs ?? []).map((p) => [p.id, p.code]))
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const ncIds = (meas ?? []).map((m) => m.nonconformity_id).filter((x): x is string => !!x)
  const { data: ncs } = ncIds.length
    ? await s.supabase.from("nonconformities").select("id, code").in("id", ncIds)
    : { data: [] as { id: string; code: string }[] }
  const ncCode = new Map((ncs ?? []).map((n) => [n.id, n.code]))
  const person = await peopleOf(s.org, [...(meas ?? []).map((m) => m.captured_by), ...(log ?? []).map((x) => x.actor_id)])

  const measurements: IndicatorMeasurementView[] = (meas ?? []).map((m) => ({
    id: m.id,
    period: m.period,
    value: Number(m.value),
    numerator: m.numerator === null ? null : Number(m.numerator),
    denominator: m.denominator === null ? null : Number(m.denominator),
    compliance: m.compliance as ComplianceStatus,
    note: m.note,
    capturedByName: m.captured_by ? person(m.captured_by).fullName : "—",
    nonconformityCode: m.nonconformity_id ? ncCode.get(m.nonconformity_id) ?? null : null,
  }))
  const last = measurements[0] ?? null // ya viene desc por periodo

  return {
    id: i.id, code: i.code, name: i.name,
    processName: i.process_id ? procCode.get(i.process_id) ?? null : null,
    description: i.description,
    unit: i.unit, direction: i.direction as IndicatorDirection,
    target: Number(i.target), targetMax: i.target_max === null ? null : Number(i.target_max),
    tolerancePct: i.tolerance_pct === null ? null : Number(i.tolerance_pct),
    frequency: i.frequency as IndicatorFrequency,
    ownerName: i.owner_position_id ? posName.get(i.owner_position_id) ?? null : null,
    isRate: i.is_rate, status: i.status as IndicatorStatus,
    lastCompliance: last ? last.compliance : null,
    lastPeriod: last ? last.period : null,
    measurements,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: INDICATOR_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageIndicators(s.user),
    canMeasure: canMeasureIndicator(s.user, i.process_id),
  }
}

// ---------- Revisión por la dirección (ISO 9.3) ----------

const REVIEW_EVENT_TEXT: Record<string, string> = {
  crear_revision: "Creó el acta.",
  actualizar_snapshot_revision: "Actualizó los datos del sistema.",
  editar_revision: "Editó las entradas.",
  agregar_decision: "Agregó una decisión.",
  generar_nc_decision: "Generó una no conformidad desde una decisión.",
  cerrar_revision: "Cerró y firmó el acta.",
  cancelar_revision: "Canceló el acta.",
}

const n = (v: unknown): number => (typeof v === "number" ? v : 0)
const nOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null)

function toSnapshot(raw: unknown): ReviewSnapshot {
  const s = (raw ?? {}) as Record<string, Record<string, unknown>>
  return {
    nc: { abiertas: n(s.nc?.abiertas), cerradas: n(s.nc?.cerradas), eficaces: n(s.nc?.eficaces) },
    auditorias: { realizadas: n(s.auditorias?.realizadas), hallazgosNc: n(s.auditorias?.hallazgosNc) },
    indicadores: { cumplenPct: nOrNull(s.indicadores?.cumplenPct), enRiesgo: n(s.indicadores?.enRiesgo), noCumplen: n(s.indicadores?.noCumplen) },
    riesgos: { altos: n(s.riesgos?.altos), controlesATiempoPct: nOrNull(s.riesgos?.controlesATiempoPct) },
    documentos: { vigentes: n(s.documentos?.vigentes), porVencer: n(s.documentos?.porVencer) },
    accionesPrevias: { total: n(s.accionesPrevias?.total), pendientes: n(s.accionesPrevias?.pendientes) },
  }
}

function toInputs(raw: unknown): ReviewInputs {
  const i = (raw ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  return {
    satisfaccion: str(i.satisfaccion), retroalimentacion: str(i.retroalimentacion),
    proveedores: str(i.proveedores), recursos: str(i.recursos), mejora: str(i.mejora),
  }
}

export async function listReviews(): Promise<ReviewListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: revs }, { data: outs }] = await Promise.all([
    s.supabase.from("management_reviews").select("id, code, title, period_start, period_end, meeting_date, status").eq("organization_id", s.org).order("meeting_date", { ascending: false }),
    s.supabase.from("review_outputs").select("review_id").eq("organization_id", s.org),
  ])
  const count = new Map<string, number>()
  for (const o of outs ?? []) count.set(o.review_id, (count.get(o.review_id) ?? 0) + 1)
  return (revs ?? []).map((r) => ({
    id: r.id, code: r.code, title: r.title,
    periodStart: r.period_start, periodEnd: r.period_end, meetingDate: r.meeting_date,
    status: r.status as ReviewStatus, outputCount: count.get(r.id) ?? 0,
  }))
}

/** Ficha completa de un acta por su código. null si no existe o no es visible. */
export async function getReview(code: string): Promise<ReviewDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: r } = await s.supabase.from("management_reviews").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!r) return null

  const [{ data: outs }, { data: positions }, { data: log }] = await Promise.all([
    s.supabase.from("review_outputs").select("*").eq("review_id", r.id).order("created_at"),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "RevisionDireccion").eq("entity_id", r.id).order("at", { ascending: false }),
  ])
  const posName = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const ncIds = (outs ?? []).map((o) => o.nonconformity_id).filter((x): x is string => !!x)
  const { data: ncs } = ncIds.length
    ? await s.supabase.from("nonconformities").select("id, code").in("id", ncIds)
    : { data: [] as { id: string; code: string }[] }
  const ncCode = new Map((ncs ?? []).map((x) => [x.id, x.code]))
  const person = await peopleOf(s.org, [r.approved_by, ...(log ?? []).map((x) => x.actor_id)])

  const outputs: ReviewOutputView[] = (outs ?? []).map((o) => ({
    id: o.id,
    kind: o.kind as ReviewOutputKind,
    description: o.description,
    responsibleName: o.responsible_position_id ? posName.get(o.responsible_position_id) ?? null : null,
    dueDate: o.due_date,
    nonconformityCode: o.nonconformity_id ? ncCode.get(o.nonconformity_id) ?? null : null,
  }))

  return {
    id: r.id, code: r.code, title: r.title,
    periodStart: r.period_start, periodEnd: r.period_end, meetingDate: r.meeting_date,
    attendees: r.attendees, scope: r.scope,
    status: r.status as ReviewStatus,
    snapshot: toSnapshot(r.snapshot), inputs: toInputs(r.inputs),
    outputs,
    approvedByName: r.approved_by ? person(r.approved_by).fullName : null,
    approvedAt: r.approved_at,
    cancelReason: r.cancel_reason,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: REVIEW_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageReviews(s.user),
  }
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
  const showIp = canSeeSignatureIp(user)

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
            ip: showIp && x.ip ? String(x.ip) : "",
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

/** Nombre y correo de los miembros (solo Admin y Líder SIG; el correo no se lee por REST). */
async function memberContacts(org: string, count: number) {
  if (!count) return []
  const { data } = await (await createClient()).rpc("member_contacts", { org })
  return (data ?? []).map((c) => ({ id: c.user_id, full_name: c.full_name, email: c.email }))
}

export async function listMembers(): Promise<Member[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: memberships }, { data: invitations }, { data: positions }] = await Promise.all([
    s.supabase.from("memberships").select("*").eq("organization_id", s.org),
    s.supabase.from("invitations").select("*").eq("organization_id", s.org).is("accepted_at", null),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
  ])
  const ms = memberships ?? []
  const profiles = await memberContacts(s.org, ms.length)
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
  const [profiles, { data: positions }] = await Promise.all([
    memberContacts(s.org, ms.length),
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

/** Solo Superadmin con MFA: organizaciones y conteo de usuarios (sin contenido de los clientes). */
export async function listOrganizations(): Promise<Organization[]> {
  const user = await getCurrentUser()
  if (!user.isPlatformAdmin) return []
  const { data } = await (await createClient()).rpc("platform_organizations")
  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    nit: o.nit,
    status: o.status as Organization["status"],
    userCount: o.user_count,
    createdAt: o.created_at,
    pendingAdminInvitationId: o.pending_admin_invitation,
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

// ---------- Competencias (ISO 7.2) ----------

const DUE_SOON_DAYS = 60

/** Carga las tablas base del módulo (RLS aplicada) para armar la matriz y el resumen. */
async function competencyBase(s: NonNullable<Awaited<ReturnType<typeof scope>>>) {
  const [comps, reqs, mems, positions, processes, assess] = await Promise.all([
    s.supabase.from("competencies").select("id, name, kind, is_active").eq("organization_id", s.org).then((r) => r.data ?? []),
    s.supabase.from("position_competencies").select("position_id, competency_id, required_level, is_mandatory").eq("organization_id", s.org).eq("is_active", true).then((r) => r.data ?? []),
    s.supabase.from("memberships").select("id, user_id, position_id").eq("organization_id", s.org).eq("status", "activo").then((r) => r.data ?? []),
    s.supabase.from("positions").select("id, name, process_id").eq("organization_id", s.org).then((r) => r.data ?? []),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org).then((r) => r.data ?? []),
    s.supabase.from("competency_assessments").select("membership_id, competency_id, assessed_level, status").eq("organization_id", s.org).then((r) => r.data ?? []),
  ])
  return { comps, reqs, mems, positions, processes, assess }
}

export async function getCompetencyMatrix(): Promise<CompetencyMatrix> {
  const s = await scope()
  if (!s) return { columns: [], rows: [] }
  const { comps, reqs, mems, positions, processes, assess } = await competencyBase(s)
  const compMap = new Map(comps.map((c) => [c.id, c]))
  const posMap = new Map(positions.map((p) => [p.id, p]))
  const procMap = new Map(processes.map((p) => [p.id, p.name]))
  const person = await peopleOf(s.org, mems.map((m) => m.user_id))
  const reqByPos = new Map<string, typeof reqs>()
  for (const r of reqs) reqByPos.set(r.position_id, [...(reqByPos.get(r.position_id) ?? []), r])

  const usedCompetencies = new Set<string>()
  const rows: MatrixRow[] = []
  for (const m of mems) {
    if (!m.position_id) continue
    const posReqs = reqByPos.get(m.position_id)
    if (!posReqs || posReqs.length === 0) continue
    const pos = posMap.get(m.position_id)
    const cells = posReqs.map((r) => {
      const a = assess.find((x) => x.membership_id === m.id && x.competency_id === r.competency_id)
      usedCompetencies.add(r.competency_id)
      return {
        competencyId: r.competency_id,
        requiredLevel: r.required_level as 1 | 2 | 3,
        assessedLevel: (a ? (a.assessed_level as AssessedLevel) : null),
        status: (a ? (a.status as CompetencyStatus) : "sin_evaluar") as CompetencyStatus,
      }
    })
    rows.push({
      membershipId: m.id,
      personName: person(m.user_id).fullName,
      positionName: pos?.name ?? "—",
      processName: pos?.process_id ? procMap.get(pos.process_id) ?? null : null,
      cells,
    })
  }
  rows.sort((a, b) => (a.processName ?? "").localeCompare(b.processName ?? "") || a.personName.localeCompare(b.personName))
  const columns = [...usedCompetencies]
    .map((id) => ({ competencyId: id, competencyName: compMap.get(id)?.name ?? "—", kind: (compMap.get(id)?.kind ?? "habilidad") as CompetencyKind }))
    .sort((a, b) => a.competencyName.localeCompare(b.competencyName))
  return { columns, rows }
}

export async function getCompetencySummary(): Promise<CompetencySummary> {
  const s = await scope()
  if (!s) return { coveragePct: null, openGaps: 0, certificatesDueSoon: 0 }
  const { reqs, mems, assess } = await competencyBase(s)
  // Cobertura: requisitos OBLIGATORIOS de cargos ocupados, cumplidos vs. requeridos.
  let required = 0
  let met = 0
  for (const m of mems) {
    if (!m.position_id) continue
    for (const r of reqs) {
      if (r.position_id !== m.position_id || !r.is_mandatory) continue
      required++
      const a = assess.find((x) => x.membership_id === m.id && x.competency_id === r.competency_id)
      if (a?.status === "cumple") met++
    }
  }
  const openGaps = assess.filter((a) => a.status === "brecha" || a.status === "brecha_en_plan").length
  const limit = addDays(todayIsoDate(), DUE_SOON_DAYS)
  const { data: att } = await s.supabase
    .from("training_attendees")
    .select("valid_until")
    .eq("organization_id", s.org)
    .not("valid_until", "is", null)
    .lte("valid_until", limit)
  return { coveragePct: required === 0 ? null : Math.round((met * 100) / required), openGaps, certificatesDueSoon: att?.length ?? 0 }
}

export async function listCompetencyCatalog(): Promise<CompetencyListItem[]> {
  const s = await scope()
  if (!s) return []
  const [comps, reqs] = await Promise.all([
    s.supabase.from("competencies").select("id, name, description, kind, is_active").eq("organization_id", s.org).order("name").then((r) => r.data ?? []),
    s.supabase.from("position_competencies").select("competency_id, position_id").eq("organization_id", s.org).eq("is_active", true).then((r) => r.data ?? []),
  ])
  const count = new Map<string, Set<string>>()
  for (const r of reqs) count.set(r.competency_id, (count.get(r.competency_id) ?? new Set<string>()).add(r.position_id))
  return comps.map((c) => ({
    id: c.id, name: c.name, description: c.description, kind: c.kind as CompetencyKind,
    isActive: c.is_active, positionCount: count.get(c.id)?.size ?? 0,
  }))
}

export async function listTrainings(): Promise<TrainingListItem[]> {
  const s = await scope()
  if (!s) return []
  const [trainings, attendees] = await Promise.all([
    s.supabase.from("trainings").select("id, title, kind, provider, training_date, hours").eq("organization_id", s.org).order("training_date", { ascending: false }).then((r) => r.data ?? []),
    s.supabase.from("training_attendees").select("training_id").eq("organization_id", s.org).then((r) => r.data ?? []),
  ])
  const count = new Map<string, number>()
  for (const a of attendees) count.set(a.training_id, (count.get(a.training_id) ?? 0) + 1)
  return trainings.map((t) => ({
    id: t.id, title: t.title, kind: t.kind as "interna" | "externa", provider: t.provider,
    trainingDate: t.training_date, hours: t.hours, attendeeCount: count.get(t.id) ?? 0,
  }))
}

export async function getPositionProfile(positionId: string): Promise<PositionProfileDetail | null> {
  if (!isUuid(positionId)) return null
  const s = await scope()
  if (!s) return null
  const { data: pos } = await s.supabase.from("positions").select("id, name, process_id").eq("organization_id", s.org).eq("id", positionId).maybeSingle()
  if (!pos) return null
  const [{ data: reqs }, { data: comps }, proc] = await Promise.all([
    s.supabase.from("position_competencies").select("id, competency_id, required_level, is_mandatory, note").eq("organization_id", s.org).eq("position_id", positionId).eq("is_active", true),
    s.supabase.from("competencies").select("id, name, kind").eq("organization_id", s.org),
    pos.process_id ? s.supabase.from("processes").select("name").eq("id", pos.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
  ])
  const compMap = new Map((comps ?? []).map((c) => [c.id, c]))
  const requirements: PositionRequirement[] = (reqs ?? []).map((r) => ({
    id: r.id, competencyId: r.competency_id, competencyName: compMap.get(r.competency_id)?.name ?? "—",
    kind: (compMap.get(r.competency_id)?.kind ?? "habilidad") as CompetencyKind,
    requiredLevel: r.required_level as 1 | 2 | 3, isMandatory: r.is_mandatory, note: r.note,
  })).sort((a, b) => a.competencyName.localeCompare(b.competencyName))
  return { positionId: pos.id, positionName: pos.name, processName: proc.data?.name ?? null, requirements }
}

export async function getPersonCompetencies(membershipId: string): Promise<PersonCompetencyDetail | null> {
  if (!isUuid(membershipId)) return null
  const s = await scope()
  if (!s) return null
  const { data: mem } = await s.supabase.from("memberships").select("id, user_id, position_id").eq("organization_id", s.org).eq("id", membershipId).maybeSingle()
  if (!mem) return null
  const { data: pos } = mem.position_id
    ? await s.supabase.from("positions").select("id, name, process_id").eq("id", mem.position_id).maybeSingle()
    : { data: null as { id: string; name: string; process_id: string | null } | null }
  const [{ data: reqs }, { data: comps }, { data: assess }, { data: att }, { data: trainings }, proc, { data: log }] = await Promise.all([
    mem.position_id ? s.supabase.from("position_competencies").select("competency_id, required_level").eq("organization_id", s.org).eq("position_id", mem.position_id).eq("is_active", true) : Promise.resolve({ data: [] as { competency_id: string; required_level: number }[] }),
    s.supabase.from("competencies").select("id, name, kind").eq("organization_id", s.org),
    s.supabase.from("competency_assessments").select("competency_id, assessed_level, status, next_review_date, gap_task_id").eq("organization_id", s.org).eq("membership_id", membershipId),
    s.supabase.from("training_attendees").select("id, training_id, result, certificate_path, certificate_name, valid_until").eq("organization_id", s.org).eq("membership_id", membershipId),
    s.supabase.from("trainings").select("id, title, kind, provider, training_date, hours").eq("organization_id", s.org),
    pos?.process_id ? s.supabase.from("processes").select("name").eq("id", pos.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Competencia").order("at", { ascending: false }).limit(50),
  ])
  const compMap = new Map((comps ?? []).map((c) => [c.id, c]))
  const assessMap = new Map((assess ?? []).map((a) => [a.competency_id, a]))
  const trainMap = new Map((trainings ?? []).map((t) => [t.id, t]))
  const person = await peopleOf(s.org, [mem.user_id, ...(log ?? []).map((x) => x.actor_id)])

  const competencies: PersonCompetencyRow[] = (reqs ?? []).map((r) => {
    const a = assessMap.get(r.competency_id)
    return {
      competencyId: r.competency_id, competencyName: compMap.get(r.competency_id)?.name ?? "—",
      kind: (compMap.get(r.competency_id)?.kind ?? "habilidad") as CompetencyKind,
      requiredLevel: r.required_level as 1 | 2 | 3,
      assessedLevel: a ? (a.assessed_level as AssessedLevel) : null,
      status: (a ? (a.status as CompetencyStatus) : "sin_evaluar") as CompetencyStatus,
      nextReviewDate: a?.next_review_date ?? null, gapTaskId: a?.gap_task_id ?? null,
    }
  }).sort((x, y) => x.competencyName.localeCompare(y.competencyName))

  const personTrainings: TrainingAttendeeView[] = (att ?? []).map((a) => {
    const t = trainMap.get(a.training_id)
    return {
      id: a.id, trainingId: a.training_id, title: t?.title ?? "—", kind: (t?.kind ?? "interna") as "interna" | "externa",
      provider: t?.provider ?? null, trainingDate: t?.training_date ?? "", hours: t?.hours ?? null,
      result: a.result as TrainingResult, hasCertificate: !!a.certificate_path, certificateName: a.certificate_name, validUntil: a.valid_until,
    }
  }).sort((x, y) => (y.trainingDate ?? "").localeCompare(x.trainingDate ?? ""))

  const isSelf = mem.user_id === s.user.id
  const canManage = canManageCompetencies(s.user, pos?.process_id ?? undefined)
  return {
    membershipId: mem.id, positionId: pos?.id ?? null, personName: person(mem.user_id).fullName,
    positionName: pos?.name ?? "—", processName: proc.data?.name ?? null,
    competencies, trainings: personTrainings,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: competencyEventText(x.action) })),
    canManage, isSelf,
  }
}

function competencyEventText(action: string): string {
  const map: Record<string, string> = {
    crear_competencia: "Creó una competencia del catálogo.",
    editar_competencia: "Editó una competencia.",
    archivar_competencia: "Archivó una competencia.",
    reactivar_competencia: "Reactivó una competencia.",
    definir_requisito_competencia: "Definió un requisito del perfil de un cargo.",
    quitar_requisito_competencia: "Quitó un requisito del perfil de un cargo.",
    crear_formacion: "Registró una formación.",
    registrar_asistente_formacion: "Registró asistentes a una formación.",
    evaluar_competencia: "Evaluó una competencia.",
  }
  return map[action] ?? action
}

// ---------- Proveedores (ISO 8.4) ----------

const SUPPLIER_EVENT_TEXT: Record<string, string> = {
  crear_proveedor: "Registró al proveedor.",
  editar_proveedor: "Editó los datos del proveedor.",
  evaluar_proveedor: "Evaluó al proveedor.",
  baja_proveedor: "Dio de baja al proveedor.",
  reactivar_proveedor: "Reactivó al proveedor.",
}

export async function getSupplierSummary(): Promise<SupplierSummary> {
  const s = await scope()
  if (!s) return { approved: 0, conditionedOrRejected: 0, dueForReeval: 0 }
  const { data } = await s.supabase.from("suppliers").select("status, next_eval_date, is_active").eq("organization_id", s.org)
  const rows = data ?? []
  const soon = addDays(todayIsoDate(), 30)
  return {
    approved: rows.filter((r) => r.status === "aprobado").length,
    conditionedOrRejected: rows.filter((r) => r.status === "condicionado" || r.status === "rechazado").length,
    dueForReeval: rows.filter((r) => r.is_active && r.next_eval_date !== null && r.next_eval_date <= soon).length,
  }
}

export async function listSuppliers(): Promise<SupplierListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }] = await Promise.all([
    s.supabase.from("suppliers").select("id, code, name, kind, criticality, status, process_id, next_eval_date").eq("organization_id", s.org).order("name"),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((r) => ({
    id: r.id, code: r.code, name: r.name,
    kind: r.kind as SupplierListItem["kind"], criticality: r.criticality as SupplierListItem["criticality"],
    status: r.status as SupplierListItem["status"],
    processName: r.process_id ? procMap.get(r.process_id) ?? null : null,
    nextEvalDate: r.next_eval_date,
  }))
}

export async function getSupplier(code: string): Promise<SupplierDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: r } = await s.supabase.from("suppliers").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!r) return null
  const [{ data: evals }, { data: proc }, { data: log }] = await Promise.all([
    s.supabase.from("supplier_evaluations").select("*").eq("supplier_id", r.id).order("eval_date", { ascending: false }).order("created_at", { ascending: false }),
    r.process_id ? s.supabase.from("processes").select("name").eq("id", r.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Proveedor").eq("entity_id", r.id).order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, [...(evals ?? []).map((e) => e.evaluated_by), ...(log ?? []).map((x) => x.actor_id)])
  const evaluations: SupplierEvaluationView[] = (evals ?? []).map((e) => ({
    id: e.id, kind: e.kind as SupplierEvaluationView["kind"], evalDate: e.eval_date,
    scoreQuality: e.score_quality, scoreDelivery: e.score_delivery, scoreService: e.score_service,
    totalScore: Number(e.total_score), result: e.result as SupplierEvaluationView["result"],
    nextEvalDate: e.next_eval_date, note: e.note, evaluatedBy: e.evaluated_by ? person(e.evaluated_by).fullName : null,
  }))
  const last = evaluations[0] ?? null
  return {
    id: r.id, code: r.code, name: r.name, nit: r.nit,
    kind: r.kind as SupplierDetail["kind"], category: r.category,
    criticality: r.criticality as SupplierDetail["criticality"],
    processName: proc?.name ?? null, processId: r.process_id,
    contactName: r.contact_name, contactEmail: r.contact_email, contactPhone: r.contact_phone,
    status: r.status as SupplierDetail["status"], isActive: r.is_active,
    lastScore: last ? last.totalScore : null, lastResult: last ? last.result : null,
    nextEvalDate: r.next_eval_date, evaluations,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: SUPPLIER_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageSuppliers(s.user, r.process_id ?? undefined),
  }
}

// ---------- PQRS y satisfacción del cliente (ISO 9.1.2) ----------

const PQRS_EVENT_TEXT: Record<string, string> = {
  crear_pqrs: "Registró la PQRS.",
  editar_pqrs: "Editó la PQRS.",
  gestionar_pqrs: "Actualizó la gestión de la PQRS.",
  responder_pqrs: "Registró la respuesta al cliente.",
  cerrar_pqrs: "Cerró la PQRS.",
  anular_pqrs: "Anuló la PQRS.",
  generar_nc_pqrs: "Generó una no conformidad desde el reclamo.",
}

async function satisfactionList(s: NonNullable<Awaited<ReturnType<typeof scope>>>): Promise<SatisfactionMeasurementView[]> {
  const { data } = await s.supabase.from("satisfaction_measurements")
    .select("id, period, method, score, responses, note").eq("organization_id", s.org)
    .order("period", { ascending: false }).order("method")
  return (data ?? []).map((m) => ({
    id: m.id, period: m.period, method: m.method as SatisfactionMeasurementView["method"],
    score: Number(m.score), responses: m.responses, note: m.note,
  }))
}

export async function getPqrsSummary(): Promise<PqrsSummary> {
  const s = await scope()
  if (!s) return { open: 0, overdue: 0, lastSatisfactionScore: null, lastSatisfactionPeriod: null }
  const today = todayIsoDate()
  const [{ data: rows }, sat] = await Promise.all([
    s.supabase.from("pqrs_cases").select("status, due_date").eq("organization_id", s.org),
    satisfactionList(s),
  ])
  const openRows = (rows ?? []).filter((r) => r.status === "recibida" || r.status === "en_gestion" || r.status === "resuelta")
  const last = sat[0] ?? null
  return {
    open: openRows.length,
    overdue: openRows.filter((r) => r.due_date < today).length,
    lastSatisfactionScore: last ? last.score : null,
    lastSatisfactionPeriod: last ? last.period : null,
  }
}

export async function listPqrs(): Promise<PqrsListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }] = await Promise.all([
    s.supabase.from("pqrs_cases").select("id, code, type, customer_name, status, process_id, due_date").eq("organization_id", s.org).order("received_date", { ascending: false }),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((r) => ({
    id: r.id, code: r.code, type: r.type as PqrsListItem["type"], customerName: r.customer_name,
    status: r.status as PqrsListItem["status"], processName: r.process_id ? procMap.get(r.process_id) ?? null : null,
    dueDate: r.due_date,
  }))
}

export async function listSatisfaction(): Promise<SatisfactionMeasurementView[]> {
  const s = await scope()
  if (!s) return []
  return satisfactionList(s)
}

export async function getPqrs(code: string): Promise<PqrsDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: r } = await s.supabase.from("pqrs_cases").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!r) return null
  const [{ data: proc }, { data: pos }, { data: nc }, { data: log }] = await Promise.all([
    r.process_id ? s.supabase.from("processes").select("name").eq("id", r.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    r.responsible_position_id ? s.supabase.from("positions").select("name").eq("id", r.responsible_position_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    r.nonconformity_id ? s.supabase.from("nonconformities").select("code").eq("id", r.nonconformity_id).maybeSingle() : Promise.resolve({ data: null as { code: string } | null }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "PQRS").eq("entity_id", r.id).order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  return {
    id: r.id, code: r.code, type: r.type as PqrsDetail["type"], channel: r.channel as PqrsDetail["channel"],
    customerName: r.customer_name, customerContact: r.customer_contact,
    processName: proc?.name ?? null, processId: r.process_id,
    description: r.description, receivedDate: r.received_date, dueDate: r.due_date,
    status: r.status as PqrsDetail["status"], responsibleName: pos?.name ?? null,
    response: r.response, satisfied: r.satisfied, nonconformityCode: nc?.code ?? null,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: PQRS_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManagePqrs(s.user, r.process_id ?? undefined),
  }
}

// ---------- Actas/reuniones (ISO 6.2) ----------

const MINUTE_EVENT_TEXT: Record<string, string> = {
  crear_acta: "Creó el acta.",
  editar_acta: "Editó el acta.",
  cerrar_acta: "Cerró el acta.",
  agregar_compromiso: "Agregó un compromiso.",
  cumplir_compromiso: "Marcó un compromiso como cumplido.",
}

export async function getMinutesSummary(): Promise<MinutesSummary> {
  const s = await scope()
  if (!s) return { totalYear: 0, drafts: 0, pendingCommitments: 0 }
  const year = String(new Date().getFullYear())
  const [{ data: minutes }, { data: commitments }] = await Promise.all([
    s.supabase.from("meeting_minutes").select("status, meeting_date").eq("organization_id", s.org),
    s.supabase.from("meeting_commitments").select("status").eq("organization_id", s.org),
  ])
  return {
    totalYear: (minutes ?? []).filter((m) => (m.meeting_date ?? "").slice(0, 4) === year).length,
    drafts: (minutes ?? []).filter((m) => m.status === "borrador").length,
    pendingCommitments: (commitments ?? []).filter((c) => c.status === "pendiente").length,
  }
}

export async function listMinutes(): Promise<MinuteListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }, { data: coms }] = await Promise.all([
    s.supabase.from("meeting_minutes").select("id, code, title, meeting_type, meeting_date, process_id, status").eq("organization_id", s.org).order("meeting_date", { ascending: false }),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
    s.supabase.from("meeting_commitments").select("minute_id, status").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  const counts = new Map<string, { total: number; pending: number }>()
  for (const c of coms ?? []) {
    const e = counts.get(c.minute_id) ?? { total: 0, pending: 0 }
    e.total += 1
    if (c.status === "pendiente") e.pending += 1
    counts.set(c.minute_id, e)
  }
  return (rows ?? []).map((r) => {
    const c = counts.get(r.id) ?? { total: 0, pending: 0 }
    return {
      id: r.id, code: r.code, title: r.title, meetingType: r.meeting_type, meetingDate: r.meeting_date,
      processName: r.process_id ? procMap.get(r.process_id) ?? null : null,
      status: r.status as MinuteListItem["status"], commitmentCount: c.total, pendingCount: c.pending,
    }
  })
}

export async function getMinute(code: string): Promise<MinuteDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: r } = await s.supabase.from("meeting_minutes").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!r) return null
  const [{ data: proc }, { data: coms }, { data: positions }, { data: log }] = await Promise.all([
    r.process_id ? s.supabase.from("processes").select("name").eq("id", r.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase.from("meeting_commitments").select("id, description, responsible_position_id, due_date, status").eq("organization_id", s.org).eq("minute_id", r.id).order("created_at"),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Acta").eq("entity_id", r.id).order("at", { ascending: false }),
  ])
  const posMap = new Map((positions ?? []).map((p) => [p.id, p.name]))
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  const commitments: CommitmentView[] = (coms ?? []).map((c) => ({
    id: c.id, description: c.description,
    responsibleName: c.responsible_position_id ? posMap.get(c.responsible_position_id) ?? null : null,
    dueDate: c.due_date, status: c.status as CommitmentView["status"],
  }))
  return {
    id: r.id, code: r.code, title: r.title, meetingType: r.meeting_type, meetingDate: r.meeting_date,
    processId: r.process_id, processName: proc?.name ?? null, attendees: r.attendees, agenda: r.agenda,
    status: r.status as MinuteDetail["status"], commitments,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: MINUTE_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageMinutes(s.user, r.process_id ?? undefined),
  }
}

// ---------- Objetivos de calidad / BSC (ISO 6.2) ----------

export async function listObjectives(): Promise<ObjectiveCardView[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }] = await Promise.all([
    s.supabase.rpc("objectives_with_progress", { p_org: s.org }),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((r) => ({
    id: r.id, code: r.code, description: r.description, perspective: r.perspective as ObjectiveCardView["perspective"],
    processName: r.process_id ? procMap.get(r.process_id) ?? null : null, processId: r.process_id,
    targetText: r.target_text, horizonYear: r.horizon_year,
    status: r.status as ObjectiveCardView["status"],
    indicatorCount: r.indicator_count ?? 0,
    progressPct: r.progress_pct === null || r.progress_pct === undefined ? null : Number(r.progress_pct),
    indicatorIds: (r.indicator_ids ?? []) as string[],
    canManage: canManageObjectives(s.user, r.process_id ?? undefined),
  }))
}

export async function listObjectiveIndicators(): Promise<ObjectiveIndicatorRef[]> {
  const s = await scope()
  if (!s) return []
  const { data } = await s.supabase.from("indicators").select("id, name").eq("organization_id", s.org).eq("status", "activo").order("name")
  return (data ?? []).map((i) => ({ id: i.id, name: i.name }))
}

// ---------- Tablero gerencial (v1.1-1, solo lectura; reutiliza las tablas con RLS) ----------

const NC_STATUS_LABEL: Record<string, string> = {
  abierta: "Abierta", analisis_causa: "Análisis de causa", plan_accion: "Plan de acción",
  en_ejecucion: "En ejecución", verificacion: "Verificación", cerrada: "Cerrada", anulada: "Anulada",
}
const NC_SEVERITY_LABEL: Record<string, string> = { observacion: "Observación", menor: "Menor", mayor: "Mayor" }
const PERSPECTIVE_ORDER_Q: Perspective[] = ["financiera", "cliente", "procesos", "aprendizaje"]
const NC_OPEN = new Set(["abierta", "analisis_causa", "plan_accion", "en_ejecucion", "verificacion"])

/** Datos consolidados del tablero gerencial. Lectura con el cliente del usuario → RLS por organización.
 *  Filtro de proceso: NC, indicadores, objetivos, PQRS y documentos. Año: auditorías cerradas y
 *  tendencia de satisfacción; los contadores de estado son "a hoy" (punto en el tiempo). */
export async function getDashboard(filters: DashboardFilters): Promise<DashboardData> {
  const year = filters.year
  const empty: DashboardData = {
    year, hasAnyData: false, processes: [], norms: [],
    nc: { open: 0, overdueActions: 0, byStatus: [], bySeverity: [] },
    audits: { plannedOrInProgress: 0, closedThisYear: 0 },
    indicators: { active: 0, compliancePct: null, cumple: 0, atRisk: 0, notMeeting: 0, withoutMeasurement: 0 },
    objectives: { active: 0, fulfilled: 0, byPerspective: PERSPECTIVE_ORDER_Q.map((p) => ({ perspective: p, avgProgress: null, count: 0 })) },
    pqrs: { open: 0, overdue: 0 },
    satisfaction: { lastScore: null, lastPeriod: null, trend: [] },
    documents: { dueSoon: 0 },
  }
  const s = await scope()
  if (!s) return empty
  const org = s.org
  const proc = filters.processId
  const today = todayIsoDate()
  const in30 = addDays(today, 30)
  const period = currentMonthIso()
  // Segmento "Norma": acota a los procesos etiquetados con esa norma (entity_norms).
  let normSet: Set<string> | null = null
  const [{ data: normRows }, { data: tagRows }] = await Promise.all([
    s.supabase.from("norms").select("id, code, name").eq("organization_id", org).eq("is_active", true).order("code"),
    filters.normId
      ? s.supabase.from("entity_norms").select("entity_id").eq("organization_id", org).eq("entity_type", "proceso").eq("norm_id", filters.normId).eq("is_active", true)
      : Promise.resolve({ data: [] as { entity_id: string }[] }),
  ])
  if (filters.normId) normSet = new Set((tagRows ?? []).map((t) => t.entity_id))
  const keepProc = (pid: string | null) => (proc ? pid === proc : true) && (normSet ? pid !== null && normSet.has(pid) : true)
  const byProc = <T extends { process_id: string | null }>(rows: T[]) => rows.filter((r) => keepProc(r.process_id))

  const [ncQ, actQ, audQ, indQ, measQ, objRows, pqrsQ, satQ, docsCount, procsQ] = await Promise.all([
    s.supabase.from("nonconformities").select("id, status, severity, process_id").eq("organization_id", org),
    s.supabase.from("nc_actions").select("nonconformity_id, status, due_date").eq("organization_id", org),
    s.supabase.from("audits").select("status, planned_date").eq("organization_id", org),
    s.supabase.from("indicators").select("id, status, process_id").eq("organization_id", org),
    s.supabase.from("indicator_measurements").select("indicator_id, compliance").eq("organization_id", org).eq("period", period),
    s.supabase.rpc("objectives_with_progress", { p_org: org }),
    s.supabase.from("pqrs_cases").select("status, due_date, process_id").eq("organization_id", org),
    s.supabase.from("satisfaction_measurements").select("period, score").eq("organization_id", org).order("period", { ascending: true }),
    s.supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "vigente").lte("next_review_date", in30),
    s.supabase.from("processes").select("id, name").eq("organization_id", org).order("name"),
  ])

  // No conformidades
  const ncAll = byProc(ncQ.data ?? [])
  const ncIds = new Set(ncAll.map((n) => n.id))
  const ncByStatus = new Map<string, number>()
  const ncBySev = new Map<string, number>()
  for (const n of ncAll) {
    ncByStatus.set(n.status, (ncByStatus.get(n.status) ?? 0) + 1)
    if (NC_OPEN.has(n.status)) ncBySev.set(n.severity, (ncBySev.get(n.severity) ?? 0) + 1)
  }
  const overdueActions = (actQ.data ?? []).filter(
    (a) => ncIds.has(a.nonconformity_id) && (a.status === "pendiente" || a.status === "en_curso") && a.due_date < today,
  ).length
  const byStatus = Object.keys(NC_STATUS_LABEL)
    .filter((k) => (ncByStatus.get(k) ?? 0) > 0)
    .map((k) => ({ label: NC_STATUS_LABEL[k], value: ncByStatus.get(k) ?? 0, tone: k === "cerrada" ? ("exito" as const) : undefined }))
  const bySeverity = Object.keys(NC_SEVERITY_LABEL)
    .map((k) => ({ label: NC_SEVERITY_LABEL[k], value: ncBySev.get(k) ?? 0, tone: k === "mayor" ? ("error" as const) : undefined }))
    .filter((r) => r.value > 0)

  // Auditorías (año = planned_date; sin filtro de proceso en el MVP)
  const audits = {
    plannedOrInProgress: (audQ.data ?? []).filter((a) => a.status === "planificada" || a.status === "en_ejecucion").length,
    closedThisYear: (audQ.data ?? []).filter((a) => a.status === "cerrada" && a.planned_date.slice(0, 4) === String(year)).length,
  }

  // Indicadores (cumplimiento de la última medición del mes)
  const indActive = byProc(indQ.data ?? []).filter((i) => i.status === "activo")
  const activeIds = new Set(indActive.map((i) => i.id))
  const compByInd = new Map((measQ.data ?? []).filter((m) => activeIds.has(m.indicator_id)).map((m) => [m.indicator_id, m.compliance]))
  let cumple = 0, atRisk = 0, notMeeting = 0
  for (const id of activeIds) {
    const c = compByInd.get(id)
    if (c === "cumple") cumple++
    else if (c === "en_riesgo") atRisk++
    else if (c === "no_cumple") notMeeting++
  }
  const measured = compByInd.size
  const indicators = {
    active: indActive.length,
    compliancePct: measured ? Math.round((cumple / measured) * 100) : null,
    cumple, atRisk, notMeeting, withoutMeasurement: indActive.length - measured,
  }

  // Objetivos (avance derivado por el RPC; filtro de proceso en TS)
  type ObjRow = { perspective: string; process_id: string | null; status: string; progress_pct: number | null }
  const objAll = ((objRows.data ?? []) as ObjRow[]).filter((o) => (proc ? o.process_id === proc : true))
  const byPerspective = PERSPECTIVE_ORDER_Q.map((p) => {
    const inP = objAll.filter((o) => o.perspective === p)
    const withPct = inP.filter((o) => o.progress_pct !== null && o.progress_pct !== undefined)
    const avg = withPct.length ? Math.round(withPct.reduce((n, o) => n + Number(o.progress_pct), 0) / withPct.length) : null
    return { perspective: p, avgProgress: avg, count: inP.length }
  })
  const objectives = {
    active: objAll.filter((o) => o.status === "activo").length,
    fulfilled: objAll.filter((o) => o.status === "cumplido").length,
    byPerspective,
  }

  // PQRS (abiertas / vencidas a hoy)
  const pqrsAll = byProc(pqrsQ.data ?? [])
  const pqrsOpen = pqrsAll.filter((q) => q.status === "recibida" || q.status === "en_gestion" || q.status === "resuelta")
  const pqrs = { open: pqrsOpen.length, overdue: pqrsOpen.filter((q) => q.due_date < today).length }

  // Satisfacción (tendencia del año; si el año no tiene, usa las últimas del histórico)
  const satRows = (satQ.data ?? []).map((m) => ({ period: m.period as string, score: Number(m.score) }))
  const satYear = satRows.filter((m) => m.period.slice(0, 4) === String(year))
  const trendSrc = satYear.length ? satYear : satRows
  const trend = trendSrc.slice(-6)
  const last = satRows[satRows.length - 1] ?? null
  const satisfaction = { lastScore: last ? last.score : null, lastPeriod: last ? last.period : null, trend }

  const documents = { dueSoon: docsCount.count ?? 0 }

  const hasAnyData =
    ncAll.length > 0 || (audQ.data ?? []).length > 0 || indActive.length > 0 || objAll.length > 0 ||
    pqrsAll.length > 0 || satRows.length > 0 || (documents.dueSoon > 0)

  return {
    year, hasAnyData,
    processes: (procsQ.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    norms: (normRows ?? []).map((n) => ({ id: n.id, code: n.code, name: n.name })),
    nc: { open: ncAll.filter((n) => NC_OPEN.has(n.status)).length, overdueActions, byStatus, bySeverity },
    audits, indicators, objectives, pqrs, satisfaction, documents,
  }
}

// ---------- Encuesta de satisfacción enviable (v1.1-2) ----------

export async function listSurveys(): Promise<SurveyCampaign[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: surveys }, { data: resp }, { data: procs }] = await Promise.all([
    s.supabase.from("satisfaction_surveys").select("id, code, title, method, scale, period, process_id, status, token").eq("organization_id", s.org).order("period", { ascending: false }).order("code", { ascending: false }),
    s.supabase.from("survey_responses").select("survey_id, score").eq("organization_id", s.org),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  const agg = new Map<string, { n: number; sum: number }>()
  for (const r of resp ?? []) {
    const e = agg.get(r.survey_id) ?? { n: 0, sum: 0 }
    e.n += 1; e.sum += Number(r.score)
    agg.set(r.survey_id, e)
  }
  return (surveys ?? []).map((v) => {
    const a = agg.get(v.id)
    return {
      id: v.id, code: v.code, title: v.title, method: v.method as SurveyCampaign["method"],
      scale: v.scale as SurveyCampaign["scale"], period: v.period,
      processName: v.process_id ? procMap.get(v.process_id) ?? null : null,
      status: v.status as SurveyCampaign["status"],
      responseCount: a?.n ?? 0, avgScore: a && a.n ? Math.round((a.sum / a.n) * 100) / 100 : null,
      token: v.token,
    }
  })
}

/** Lectura pública por token (cliente anónimo en la página pública). null si no existe. */
export async function getPublicSurvey(token: string): Promise<PublicSurvey | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_survey_public", { p_token: token })
  const row = data?.[0]
  if (!row) return null
  return { title: row.title, method: row.method as PublicSurvey["method"], scale: row.scale as PublicSurvey["scale"], isOpen: row.is_open }
}

/** Respuestas de una campaña (para exportar; RLS limita a roles SIG de la org). */
export async function listSurveyResponses(surveyId: string): Promise<{ score: number; comment: string | null; createdAt: string }[]> {
  const s = await scope()
  if (!s || !isUuid(surveyId)) return []
  const { data } = await s.supabase.from("survey_responses").select("score, comment, created_at").eq("organization_id", s.org).eq("survey_id", surveyId).order("created_at", { ascending: false })
  return (data ?? []).map((r) => ({ score: Number(r.score), comment: r.comment, createdAt: r.created_at }))
}

// ---------- Requisitos legales (v1.1-3) ----------

const LEGAL_EVENT_TEXT: Record<string, string> = {
  crear_requisito: "Registró el requisito.",
  editar_requisito: "Editó el requisito.",
  evaluar_requisito: "Evaluó el cumplimiento.",
  derogar_requisito: "Derogó el requisito.",
}

const legalComplianceOf = (evals: { requirement_id: string; evaluated_at: string; compliance: string }[], reqId: string): LegalRequirementListItem["compliance"] => {
  const latest = evals.filter((e) => e.requirement_id === reqId).sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))[0]
  return (latest?.compliance as LegalRequirementListItem["compliance"]) ?? "no_evaluado"
}

export async function getLegalSummary(): Promise<LegalSummary> {
  const s = await scope()
  if (!s) return { active: 0, notMeeting: 0, dueSoon: 0 }
  const soon = addDays(todayIsoDate(), 30)
  const [{ data: reqs }, { data: evals }] = await Promise.all([
    s.supabase.from("legal_requirements").select("id, status, next_eval_date").eq("organization_id", s.org),
    s.supabase.from("legal_evaluations").select("requirement_id, evaluated_at, compliance").eq("organization_id", s.org),
  ])
  const active = (reqs ?? []).filter((r) => r.status === "vigente")
  return {
    active: active.length,
    notMeeting: active.filter((r) => legalComplianceOf(evals ?? [], r.id) === "no_cumple").length,
    dueSoon: active.filter((r) => r.next_eval_date !== null && r.next_eval_date <= soon).length,
  }
}

export async function listLegalRequirements(): Promise<LegalRequirementListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: reqs }, { data: evals }, { data: procs }] = await Promise.all([
    s.supabase.from("legal_requirements").select("id, code, title, source_type, reference, process_id, status, next_eval_date").eq("organization_id", s.org).order("code", { ascending: false }),
    s.supabase.from("legal_evaluations").select("requirement_id, evaluated_at, compliance").eq("organization_id", s.org),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (reqs ?? []).map((r) => ({
    id: r.id, code: r.code, title: r.title, sourceType: r.source_type as LegalRequirementListItem["sourceType"],
    reference: r.reference, processName: r.process_id ? procMap.get(r.process_id) ?? null : null,
    status: r.status as LegalRequirementListItem["status"],
    compliance: legalComplianceOf(evals ?? [], r.id), nextEvalDate: r.next_eval_date,
  }))
}

export async function getLegalRequirement(code: string): Promise<LegalRequirementDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: r } = await s.supabase.from("legal_requirements").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!r) return null
  const [{ data: proc }, { data: evals }, { data: log }] = await Promise.all([
    r.process_id ? s.supabase.from("processes").select("name").eq("id", r.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase.from("legal_evaluations").select("id, evaluated_at, compliance, evidence, note, created_by").eq("organization_id", s.org).eq("requirement_id", r.id).order("evaluated_at", { ascending: false }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Requisito").eq("entity_id", r.id).order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, [...(evals ?? []).map((e) => e.created_by), ...(log ?? []).map((x) => x.actor_id)])
  const evaluations: LegalEvaluationView[] = (evals ?? []).map((e) => ({
    id: e.id, evaluatedAt: e.evaluated_at, compliance: e.compliance as LegalEvaluationView["compliance"],
    evidence: e.evidence, evaluatedBy: e.created_by ? person(e.created_by).fullName : "—", note: e.note,
  }))
  return {
    id: r.id, code: r.code, title: r.title, sourceType: r.source_type as LegalRequirementDetail["sourceType"],
    reference: r.reference, issuer: r.issuer, description: r.description,
    processId: r.process_id, processName: proc?.name ?? null, url: r.url,
    status: r.status as LegalRequirementDetail["status"], evalFrequency: r.eval_frequency as LegalRequirementDetail["evalFrequency"],
    nextEvalDate: r.next_eval_date,
    compliance: (evaluations[0]?.compliance as LegalRequirementDetail["compliance"]) ?? "no_evaluado",
    evaluations,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: LEGAL_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageLegal(s.user, r.process_id ?? undefined),
  }
}

// ---------- Multi-norma y peligros SST (v1.1-4) ----------

const HAZARD_EVENT_TEXT: Record<string, string> = {
  crear_peligro: "Registró el peligro.",
  editar_peligro: "Editó la valoración del peligro.",
  estado_peligro: "Cambió el estado del peligro.",
}

export async function listNorms(): Promise<Norm[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: norms }, { data: tags }] = await Promise.all([
    s.supabase.from("norms").select("id, code, name, is_active").eq("organization_id", s.org).order("code"),
    s.supabase.from("entity_norms").select("norm_id").eq("organization_id", s.org).eq("is_active", true),
  ])
  const count = new Map<string, number>()
  for (const t of tags ?? []) count.set(t.norm_id, (count.get(t.norm_id) ?? 0) + 1)
  return (norms ?? []).map((n) => ({ id: n.id, code: n.code, name: n.name, isActive: n.is_active, taggedCount: count.get(n.id) ?? 0 }))
}

export async function listActiveNorms(): Promise<NormOption[]> {
  const s = await scope()
  if (!s) return []
  const { data } = await s.supabase.from("norms").select("id, code, name").eq("organization_id", s.org).eq("is_active", true).order("code")
  return (data ?? []).map((n) => ({ id: n.id, code: n.code, name: n.name }))
}

/** Normas (activas) etiquetadas a una entidad concreta. */
export async function getEntityNorms(entityType: string, entityId: string): Promise<NormOption[]> {
  const s = await scope()
  if (!s || !isUuid(entityId)) return []
  const { data } = await s.supabase
    .from("entity_norms")
    .select("norm:norms(id, code, name)")
    .eq("organization_id", s.org).eq("entity_type", entityType).eq("entity_id", entityId).eq("is_active", true)
  return (data ?? []).flatMap((r) => {
    const n = r.norm as unknown as { id: string; code: string; name: string } | null
    return n ? [{ id: n.id, code: n.code, name: n.name }] : []
  })
}

/** Mapa entidad→normas para un tipo (para pintar chips en listas). */
export async function listEntityNormsFor(entityType: string): Promise<Map<string, NormOption[]>> {
  const s = await scope()
  const map = new Map<string, NormOption[]>()
  if (!s) return map
  const { data } = await s.supabase
    .from("entity_norms")
    .select("entity_id, norm:norms(id, code, name)")
    .eq("organization_id", s.org).eq("entity_type", entityType).eq("is_active", true)
  for (const r of data ?? []) {
    const n = r.norm as unknown as { id: string; code: string; name: string } | null
    if (!n) continue
    const arr = map.get(r.entity_id) ?? []
    arr.push({ id: n.id, code: n.code, name: n.name })
    map.set(r.entity_id, arr)
  }
  return map
}

export async function getHazardsSummary(): Promise<HazardsSummary> {
  const s = await scope()
  if (!s) return { active: 0, levelI: 0, dueSoon: 0 }
  const soon = addDays(todayIsoDate(), 30)
  const { data } = await s.supabase.from("hazards").select("status, risk_level, next_review_date").eq("organization_id", s.org)
  const active = (data ?? []).filter((h) => h.status === "activo")
  return {
    active: active.length,
    levelI: active.filter((h) => h.risk_level === "I").length,
    dueSoon: active.filter((h) => h.next_review_date !== null && h.next_review_date <= soon).length,
  }
}

export async function listHazards(): Promise<HazardListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }] = await Promise.all([
    s.supabase.from("hazards").select("id, code, hazard, classification, process_id, area, nr, risk_level, status").eq("organization_id", s.org).order("nr", { ascending: false }),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((h) => ({
    id: h.id, code: h.code, hazard: h.hazard, classification: h.classification as HazardListItem["classification"],
    processName: h.process_id ? procMap.get(h.process_id) ?? null : null, area: h.area,
    nr: h.nr, riskLevel: h.risk_level as HazardListItem["riskLevel"], status: h.status as HazardListItem["status"],
  }))
}

export async function getHazard(code: string): Promise<HazardDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: h } = await s.supabase.from("hazards").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!h) return null
  const [{ data: proc }, { data: pos }, { data: log }] = await Promise.all([
    h.process_id ? s.supabase.from("processes").select("name").eq("id", h.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    h.responsible_position_id ? s.supabase.from("positions").select("name").eq("id", h.responsible_position_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Peligro").eq("entity_id", h.id).order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  return {
    id: h.id, code: h.code, processId: h.process_id, processName: proc?.name ?? null, area: h.area,
    hazard: h.hazard, classification: h.classification as HazardDetail["classification"], existingControls: h.existing_controls,
    nd: h.nd, ne: h.ne, nc: h.nc, np: h.np, nr: h.nr, riskLevel: h.risk_level as HazardDetail["riskLevel"],
    intervention: h.intervention, responsibleName: pos?.name ?? null, status: h.status as HazardDetail["status"],
    nextReviewDate: h.next_review_date,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: HAZARD_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageHazards(s.user, h.process_id ?? undefined),
  }
}

// ---------- Aspectos ambientales (v1.1-4b, ISO 14001) ----------

const ENV_EVENT_TEXT: Record<string, string> = {
  crear_aspecto: "Registró el aspecto ambiental.",
  editar_aspecto: "Editó la valoración del aspecto.",
  estado_aspecto: "Cambió el estado del aspecto.",
}

export async function getEnvSummary(): Promise<EnvAspectsSummary> {
  const s = await scope()
  if (!s) return { active: 0, significant: 0, dueSoon: 0 }
  const soon = addDays(todayIsoDate(), 30)
  const { data } = await s.supabase.from("env_aspects").select("status, significance, next_review_date").eq("organization_id", s.org)
  const active = (data ?? []).filter((a) => a.status === "activo")
  return {
    active: active.length,
    significant: active.filter((a) => a.significance === "significativo").length,
    dueSoon: active.filter((a) => a.next_review_date !== null && a.next_review_date <= soon).length,
  }
}

export async function listEnvAspects(): Promise<EnvAspectListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: rows }, { data: procs }] = await Promise.all([
    s.supabase.from("env_aspects").select("id, code, aspect, impact, condition, process_id, score, significance, status").eq("organization_id", s.org).order("code", { ascending: false }),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  return (rows ?? []).map((a) => ({
    id: a.id, code: a.code, aspect: a.aspect, impact: a.impact,
    condition: a.condition as EnvAspectListItem["condition"],
    processName: a.process_id ? procMap.get(a.process_id) ?? null : null,
    score: a.score, significance: a.significance as EnvAspectListItem["significance"], status: a.status as EnvAspectListItem["status"],
  }))
}

export async function getEnvAspect(code: string): Promise<EnvAspectDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: a } = await s.supabase.from("env_aspects").select("*").eq("organization_id", s.org).eq("code", code).maybeSingle()
  if (!a) return null
  const [{ data: proc }, { data: pos }, { data: req }, { data: log }] = await Promise.all([
    a.process_id ? s.supabase.from("processes").select("name").eq("id", a.process_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    a.responsible_position_id ? s.supabase.from("positions").select("name").eq("id", a.responsible_position_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
    a.legal_requirement_id ? s.supabase.from("legal_requirements").select("code").eq("id", a.legal_requirement_id).maybeSingle() : Promise.resolve({ data: null as { code: string } | null }),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "Aspecto").eq("entity_id", a.id).order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  return {
    id: a.id, code: a.code, processId: a.process_id, processName: proc?.name ?? null,
    activity: a.activity, aspect: a.aspect, impact: a.impact, condition: a.condition as EnvAspectDetail["condition"],
    controls: a.controls, legalRequirementId: a.legal_requirement_id, legalRequirementCode: req?.code ?? null,
    responsibleName: pos?.name ?? null, freq: a.freq, sev: a.sev, reach: a.reach, legalCrit: a.legal_crit,
    score: a.score, significance: a.significance as EnvAspectDetail["significance"], status: a.status as EnvAspectDetail["status"],
    nextReviewDate: a.next_review_date,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: ENV_EVENT_TEXT[x.action] ?? x.action })),
    canManage: canManageEnv(s.user, a.process_id ?? undefined),
  }
}

// ---------- Formularios (v1.1-5, constructor) ----------

const FORM_EVENT_TEXT: Record<string, string> = {
  crear_plantilla: "Creó la plantilla.",
  editar_plantilla: "Editó los datos de la plantilla.",
  publicar_plantilla: "Publicó la plantilla.",
  nueva_version_plantilla: "Creó una nueva versión.",
  estado_plantilla: "Cambió el estado de la plantilla.",
  enviar_respuesta: "Se registró una respuesta.",
}

type FieldRow = {
  id: string
  order_index: number
  type: string
  label: string
  help: string | null
  required: boolean
  options: unknown
  config: unknown
}

function toFieldView(f: FieldRow): FormFieldView {
  const opts = Array.isArray(f.options) ? (f.options as unknown[]).map((x) => String(x)) : null
  const cfg = f.config && typeof f.config === "object" ? (f.config as { min?: number; max?: number }) : null
  return {
    id: f.id,
    order: f.order_index,
    type: f.type as FormFieldView["type"],
    label: f.label,
    help: f.help,
    required: f.required,
    options: opts,
    config: cfg,
  }
}

function displayVersion(t: { status: string; published_version: number | null; draft_version: number }): number {
  // La versión vigente para mostrar: la publicada si existe, si no el borrador.
  return t.published_version ?? t.draft_version
}

export async function getFormsSummary(): Promise<FormsSummary> {
  const s = await scope()
  if (!s) return { total: 0, published: 0, submissionsThisMonth: 0 }
  const now = new Date()
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`
  const [{ data: tpls }, { count: subCount }] = await Promise.all([
    s.supabase.from("form_templates").select("status").eq("organization_id", s.org),
    s.supabase
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", s.org)
      .eq("status", "enviada")
      .gte("submitted_at", monthStart),
  ])
  const active = (tpls ?? []).filter((t) => t.status !== "archivado")
  return {
    total: active.length,
    published: active.filter((t) => t.status === "publicado").length,
    submissionsThisMonth: subCount ?? 0,
  }
}

export async function listFormTemplates(): Promise<FormTemplateListItem[]> {
  const s = await scope()
  if (!s) return []
  const [{ data: tpls }, { data: fields }, { data: subs }, { data: procs }] = await Promise.all([
    s.supabase
      .from("form_templates")
      .select("id, code, title, category, status, published_version, draft_version, process_id")
      .eq("organization_id", s.org)
      .order("code", { ascending: false }),
    s.supabase.from("form_fields").select("template_id, version, type").eq("organization_id", s.org).eq("is_active", true),
    s.supabase.from("form_submissions").select("template_id").eq("organization_id", s.org).eq("status", "enviada"),
    s.supabase.from("processes").select("id, name").eq("organization_id", s.org),
  ])
  const procMap = new Map((procs ?? []).map((p) => [p.id, p.name]))
  const subCount = new Map<string, number>()
  for (const r of subs ?? []) subCount.set(r.template_id, (subCount.get(r.template_id) ?? 0) + 1)
  return (tpls ?? []).map((t) => {
    const ver = displayVersion(t)
    const fieldCount = (fields ?? []).filter(
      (f) => f.template_id === t.id && f.version === ver && f.type !== "seccion",
    ).length
    return {
      id: t.id,
      code: t.code,
      title: t.title,
      category: t.category as FormCategory,
      status: t.status as FormStatus,
      version: ver,
      processName: t.process_id ? procMap.get(t.process_id) ?? null : null,
      fieldCount,
      submissionCount: subCount.get(t.id) ?? 0,
      canManage: canManageForms(s.user, t.process_id ?? undefined),
    }
  })
}

export async function getFormTemplate(code: string): Promise<FormTemplateDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: t } = await s.supabase
    .from("form_templates")
    .select("*")
    .eq("organization_id", s.org)
    .eq("code", code)
    .maybeSingle()
  if (!t) return null
  const hasOpenDraft = t.status !== "archivado" && (t.status === "borrador" || t.draft_version > (t.published_version ?? 0))
  const shownVersion = hasOpenDraft ? t.draft_version : t.published_version ?? t.draft_version
  const [{ data: fields }, { count: subCount }, { data: proc }, { data: log }] = await Promise.all([
    s.supabase
      .from("form_fields")
      .select("id, order_index, type, label, help, required, options, config")
      .eq("organization_id", s.org)
      .eq("template_id", t.id)
      .eq("version", shownVersion)
      .eq("is_active", true)
      .order("order_index", { ascending: true }),
    s.supabase
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", s.org)
      .eq("template_id", t.id)
      .eq("status", "enviada"),
    t.process_id
      ? s.supabase.from("processes").select("name").eq("id", t.process_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    s.supabase
      .from("audit_log")
      .select("at, actor_id, action")
      .eq("organization_id", s.org)
      .eq("entity_type", "Formulario")
      .eq("entity_id", t.id)
      .order("at", { ascending: false }),
  ])
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  return {
    id: t.id,
    code: t.code,
    title: t.title,
    description: t.description,
    category: t.category as FormCategory,
    status: t.status as FormStatus,
    publishedVersion: t.published_version,
    draftVersion: t.draft_version,
    hasOpenDraft,
    processId: t.process_id,
    processName: proc?.name ?? null,
    fields: (fields ?? []).map(toFieldView),
    submissionCount: subCount ?? 0,
    canManage: canManageForms(s.user, t.process_id ?? undefined),
    canFill: canFillForms(s.user),
    timeline: (log ?? []).map((x) => ({
      at: x.at,
      actor: x.actor_id ? person(x.actor_id).fullName : "Sistema",
      text: FORM_EVENT_TEXT[x.action] ?? x.action,
    })),
  }
}

/** Formulario publicado para diligenciar (cualquier miembro activo, vía RPC definer). */
export async function getPublishedFormByCode(code: string): Promise<PublishedForm | null> {
  const s = await scope()
  if (!s) return null
  const { data, error } = await s.supabase.rpc("get_published_form_by_code", { p_org: s.org, p_code: code })
  if (error || !data) return null
  const d = data as {
    id: string; code: string; title: string; category: string; version: number
    fields: FieldRow[]
  }
  return {
    id: d.id,
    code: d.code,
    title: d.title,
    category: d.category as FormCategory,
    version: d.version,
    fields: (d.fields ?? []).map(toFieldView),
  }
}

export async function listSubmissions(templateId: string): Promise<SubmissionListItem[]> {
  const s = await scope()
  if (!s) return []
  const { data: subs } = await s.supabase
    .from("form_submissions")
    .select("id, submitted_by, template_version, status, submitted_at, created_at")
    .eq("organization_id", s.org)
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
  const person = await peopleOf(s.org, (subs ?? []).map((x) => x.submitted_by))
  return (subs ?? []).map((x) => ({
    id: x.id,
    submittedByName: x.submitted_by ? person(x.submitted_by).fullName : "—",
    templateVersion: x.template_version,
    status: x.status as SubmissionStatus,
    submittedAt: x.submitted_at,
    createdAt: x.created_at,
  }))
}

export async function getSubmission(id: string): Promise<SubmissionDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: sub } = await s.supabase
    .from("form_submissions")
    .select("id, template_id, template_version, submitted_by, status, submitted_at, created_at")
    .eq("organization_id", s.org)
    .eq("id", id)
    .maybeSingle()
  if (!sub) return null
  const [{ data: fields }, { data: vals }, person] = await Promise.all([
    s.supabase
      .from("form_fields")
      .select("id, order_index, type, label, help, required, options, config")
      .eq("organization_id", s.org)
      .eq("template_id", sub.template_id)
      .eq("version", sub.template_version)
      .eq("is_active", true)
      .order("order_index", { ascending: true }),
    s.supabase.from("submission_values").select("field_id, value").eq("organization_id", s.org).eq("submission_id", sub.id),
    peopleOf(s.org, [sub.submitted_by]),
  ])
  const values: Record<string, FieldValue> = {}
  for (const v of vals ?? []) values[v.field_id] = v.value as FieldValue
  return {
    id: sub.id,
    status: sub.status as SubmissionStatus,
    submittedByName: sub.submitted_by ? person(sub.submitted_by).fullName : "—",
    templateVersion: sub.template_version,
    submittedAt: sub.submitted_at,
    createdAt: sub.created_at,
    fields: (fields ?? []).map(toFieldView),
    values,
  }
}

/** Respuestas enviadas con sus valores (para exportar CSV). Una fila por respuesta enviada. */
export async function listSubmissionsForExport(
  templateId: string,
): Promise<{ submittedByName: string; submittedAt: string | null; templateVersion: number; values: Record<string, FieldValue> }[]> {
  const s = await scope()
  if (!s) return []
  const { data: subs } = await s.supabase
    .from("form_submissions")
    .select("id, submitted_by, submitted_at, template_version")
    .eq("organization_id", s.org)
    .eq("template_id", templateId)
    .eq("status", "enviada")
    .order("submitted_at", { ascending: false })
  if (!subs || subs.length === 0) return []
  const ids = subs.map((x) => x.id)
  const { data: vals } = await s.supabase
    .from("submission_values")
    .select("submission_id, field_id, value")
    .eq("organization_id", s.org)
    .in("submission_id", ids)
  const bySub = new Map<string, Record<string, FieldValue>>()
  for (const v of vals ?? []) {
    const m = bySub.get(v.submission_id) ?? {}
    m[v.field_id] = v.value as FieldValue
    bySub.set(v.submission_id, m)
  }
  const person = await peopleOf(s.org, subs.map((x) => x.submitted_by))
  return subs.map((x) => ({
    submittedByName: x.submitted_by ? person(x.submitted_by).fullName : "—",
    submittedAt: x.submitted_at,
    templateVersion: x.template_version,
    values: bySub.get(x.id) ?? {},
  }))
}

// ---------- SG-SST: Estándares Mínimos (Res. 0312) (v1.2-2) ----------

const SST_EVENT_TEXT: Record<string, string> = {
  crear_autoevaluacion: "Creó la autoevaluación.",
  cerrar_autoevaluacion: "Cerró la autoevaluación.",
  crear_mejora_sst: "Agregó una acción de mejora.",
}

const SST_CYCLES: SstCycle[] = ["planear", "hacer", "verificar", "actuar"]

export async function getSstSummary(): Promise<SstSummary> {
  const s = await scope()
  const empty: SstSummary = {
    evaluationCode: null, period: null, tier: null, score: null, rating: null,
    cumple: 0, noCumple: 0, noAplica: 0, pendiente: 0, openActions: 0, overdueActions: 0,
  }
  if (!s) return empty
  const { data: evals } = await s.supabase
    .from("sst_evaluations")
    .select("id, code, period, tier, score, rating")
    .eq("organization_id", s.org)
    .order("period", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
  const e = evals?.[0]
  if (!e) return empty
  const [{ data: items }, { data: actions }] = await Promise.all([
    s.supabase.from("sst_evaluation_items").select("status, standard:sst_standards(applies_7, applies_21)").eq("organization_id", s.org).eq("evaluation_id", e.id),
    s.supabase.from("sst_actions").select("status, due_date").eq("organization_id", s.org).eq("evaluation_id", e.id),
  ])
  const today = todayIsoDate()
  // Solo los estándares que APLICAN al nivel (los demás quedan autocalificados; no inflan el conteo).
  type SumRow = { status: string; standard: { applies_7: boolean; applies_21: boolean } | null }
  const applicable = ((items ?? []) as SumRow[]).filter((i) =>
    e.tier === 60 ? true : e.tier === 7 ? i.standard?.applies_7 : i.standard?.applies_21)
  const count = (st: string) => applicable.filter((i) => i.status === st).length
  const open = (actions ?? []).filter((a) => a.status === "pendiente" || a.status === "en_curso")
  return {
    evaluationCode: e.code, period: e.period, tier: e.tier,
    score: e.score, rating: e.rating as SstRating | null,
    cumple: count("cumple"), noCumple: count("no_cumple"), noAplica: count("no_aplica"), pendiente: count("pendiente"),
    openActions: open.length,
    overdueActions: open.filter((a) => a.due_date !== null && a.due_date <= today).length,
  }
}

export async function listSstEvaluations(): Promise<SstEvaluationListItem[]> {
  const s = await scope()
  if (!s) return []
  const { data } = await s.supabase
    .from("sst_evaluations")
    .select("id, code, period, tier, worker_count, risk_class, status, score, rating")
    .eq("organization_id", s.org)
    .order("period", { ascending: false })
    .order("code", { ascending: false })
  return (data ?? []).map((e) => ({
    id: e.id, code: e.code, period: e.period, tier: e.tier,
    workerCount: e.worker_count, riskClass: e.risk_class,
    status: e.status as SstEvaluationStatus, score: e.score, rating: e.rating as SstRating | null,
  }))
}

export async function getSstEvaluation(code: string): Promise<SstEvaluationDetail | null> {
  const s = await scope()
  if (!s) return null
  const { data: e } = await s.supabase
    .from("sst_evaluations")
    .select("*")
    .eq("organization_id", s.org)
    .eq("code", code)
    .maybeSingle()
  if (!e) return null
  const [{ data: items }, { data: standards }, { data: actions }, { data: positions }, { data: log }] = await Promise.all([
    s.supabase.from("sst_evaluation_items").select("id, standard_id, status, justification").eq("organization_id", s.org).eq("evaluation_id", e.id),
    s.supabase.from("sst_standards").select("id, code, name, cycle, component, order_index, weight_60, applies_7, applies_21").order("order_index", { ascending: true }),
    s.supabase.from("sst_actions").select("id, standard_id, description, responsible_position_id, due_date, status").eq("organization_id", s.org).eq("evaluation_id", e.id),
    s.supabase.from("positions").select("id, name").eq("organization_id", s.org),
    s.supabase.from("audit_log").select("at, actor_id, action").eq("organization_id", s.org).eq("entity_type", "SG-SST").eq("entity_id", e.id).order("at", { ascending: false }),
  ])
  const stdMap = new Map((standards ?? []).map((x) => [x.id, x]))
  const posMap = new Map((positions ?? []).map((p) => [p.id, p.name]))
  // Metodología oficial: peso único weight_60; el estándar aplica según el nivel (Res. 0312).
  const appliesOf = (st: { applies_7: boolean; applies_21: boolean }) =>
    e.tier === 60 ? true : e.tier === 7 ? st.applies_7 : st.applies_21

  const views: SstItemView[] = (items ?? []).map((i) => {
    const st = stdMap.get(i.standard_id)!
    return {
      itemId: i.id, standardId: i.standard_id, code: st.code, name: st.name,
      cycle: st.cycle as SstCycle, component: st.component as SstComponent,
      weight: st.weight_60 ?? 0, status: i.status as SstItemStatus, justification: i.justification,
      applicable: appliesOf(st),
    }
  }).sort((a, b) => (stdMap.get(a.standardId)!.order_index - stdMap.get(b.standardId)!.order_index))

  const phases: SstPhaseTotal[] = SST_CYCLES.map((cycle) => {
    const inPhase = views.filter((v) => v.cycle === cycle)
    const possible = inPhase.reduce((acc, v) => acc + v.weight, 0)
    const obtained = inPhase
      .filter((v) => v.status === "cumple" || (v.status === "no_aplica" && (v.justification ?? "").trim() !== ""))
      .reduce((acc, v) => acc + v.weight, 0)
    return { cycle, possible: Math.round(possible * 100) / 100, obtained: Math.round(obtained * 100) / 100 }
  }).filter((p) => p.possible > 0)

  const today = todayIsoDate()
  const actionViews: SstActionView[] = (actions ?? []).map((a) => {
    const st = stdMap.get(a.standard_id)
    return {
      id: a.id, standardCode: st?.code ?? "", standardName: st?.name ?? "",
      description: a.description, responsibleName: a.responsible_position_id ? posMap.get(a.responsible_position_id) ?? null : null,
      dueDate: a.due_date, status: a.status as SstActionStatus,
      overdue: (a.status === "pendiente" || a.status === "en_curso") && a.due_date !== null && a.due_date <= today,
    }
  })
  const person = await peopleOf(s.org, (log ?? []).map((x) => x.actor_id))
  return {
    id: e.id, code: e.code, period: e.period, tier: e.tier,
    workerCount: e.worker_count, riskClass: e.risk_class,
    status: e.status as SstEvaluationStatus, score: e.score, rating: e.rating as SstRating | null,
    canManage: canManageSst(s.user),
    items: views, phases, actions: actionViews,
    timeline: (log ?? []).map((x) => ({ at: x.at, actor: x.actor_id ? person(x.actor_id).fullName : "Sistema", text: SST_EVENT_TEXT[x.action] ?? x.action })),
  }
}
