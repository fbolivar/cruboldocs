// Acceso a datos de lectura (servidor). Hoy responde con datos de ejemplo; en la
// fase backend cada función pasa a consultar Supabase con RLS y conserva su firma.

import { demoUser, simulate } from "@/lib/data/demo"
import * as db from "@/lib/data/mock-data"
import { isMetadataOnly } from "@/lib/domain/documents"
import { RISK_LEVELS } from "@/lib/domain/risk"
import { daysFromToday } from "@/lib/format"
import type {
  ActivityEvent,
  AssessmentKind,
  AuditEntry,
  AuditFilters,
  CurrentUser,
  DocumentDetail,
  DocumentFilters,
  DocumentSummary,
  DocumentType,
  HomeSummary,
  Invitation,
  Member,
  Organization,
  Paginated,
  Position,
  Process,
  RecertificationInfo,
  Risk,
  RiskFilters,
  RiskLevel,
  RiskMatrix,
  RiskSummaryRow,
  SetupProgress,
  Task,
} from "@/lib/types"

export const PAGE_SIZE = 25

export async function getCurrentUser(): Promise<CurrentUser> {
  return demoUser()
}

// ---------- Bandeja ----------

export async function getMyTasks(user: CurrentUser): Promise<Task[]> {
  if (await simulate()) return []
  return db.tasks
    .filter((t) => t.assigneePositionId === user.positionId)
    .map(({ assigneePositionId: _omit, ...t }) => t)
}

export async function getHomeSummary(user: CurrentUser): Promise<HomeSummary> {
  const empty = await simulate()
  const mine = empty ? [] : db.tasks.filter((t) => t.assigneePositionId === user.positionId)
  const riskRole = user.roles.some((r) => ["lider_sig", "lider_proceso", "responsable_control"].includes(r.role))
  const myControls = empty
    ? []
    : db.risks.flatMap((r) => r.controls).filter((c) => c.responsiblePositionId === user.positionId && daysFromToday(c.nextDueDate) <= 30)
  return {
    pendingTasks: mine.length,
    overdueTasks: mine.filter((t) => daysFromToday(t.dueDate) < 0).length,
    documentsDueForReview30d: empty
      ? 0
      : db.documents.filter((d) => d.status === "vigente" && d.nextReviewDate && daysFromToday(d.nextReviewDate) <= 30).length,
    pendingControls: riskRole ? myControls.length : null,
  }
}

export async function getSetupProgress(): Promise<SetupProgress> {
  const empty = await simulate()
  return {
    hasProcesses: !empty,
    hasPositionsWithRoles: !empty && db.positions.some((p) => p.roles.length > 0),
    hasInvitedUsers: false,
  }
}

export async function getRecentActivity(limit = 5): Promise<ActivityEvent[]> {
  if (await simulate()) return []
  return [...db.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

// ---------- Catálogos ----------

export async function listProcesses(): Promise<Process[]> {
  if (await simulate()) return []
  return db.processes
}

export async function listDocumentTypes(): Promise<DocumentType[]> {
  if (await simulate()) return []
  return db.documentTypes
}

export async function listPositions(): Promise<Position[]> {
  if (await simulate()) return []
  return db.positions
}

// ---------- Documentos ----------

function filterDocuments(f: DocumentFilters): DocumentSummary[] {
  const q = f.q?.trim().toLocaleLowerCase("es")
  const rows = db.documents.filter(
    (d) =>
      (!q || d.code.toLocaleLowerCase("es").includes(q) || d.title.toLocaleLowerCase("es").includes(q)) &&
      (!f.processId || d.processId === f.processId) &&
      (!f.typeId || d.typeId === f.typeId) &&
      (!f.statuses?.length || f.statuses.includes(d.status)) &&
      (!f.reviewOverdue || d.reviewOverdue)
  )
  const key = f.sort ?? "code"
  const dir = f.dir === "desc" ? -1 : 1
  const val = (d: DocumentSummary) => (key === "title" ? d.title : key === "nextReview" ? d.nextReviewDate ?? "9999" : d.code)
  return rows.sort((a, b) => val(a).localeCompare(val(b), "es") * dir)
}

export async function listDocuments(f: DocumentFilters): Promise<Paginated<DocumentSummary>> {
  const empty = await simulate()
  const rows = empty ? [] : filterDocuments(f)
  const page = Math.max(1, f.page ?? 1)
  return { items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length, page, pageSize: PAGE_SIZE }
}

/** Todas las filas filtradas, sin paginar (exportación CSV). */
export async function listAllDocuments(f: DocumentFilters): Promise<DocumentSummary[]> {
  if (await simulate()) return []
  return filterDocuments(f)
}

export async function searchDocuments(q: string, limit = 8): Promise<DocumentSummary[]> {
  if (!q.trim()) return []
  return filterDocuments({ q }).slice(0, limit)
}

export async function getDocument(id: string, user: CurrentUser): Promise<DocumentDetail | null> {
  await simulate()
  const s = db.documents.find((d) => d.id === id)
  if (!s) return null
  const detail = db.buildDocumentDetail(s)
  if (!isMetadataOnly(user)) return detail
  // Admin solo metadatos: sin URLs de contenido ni comentarios de revisión (describen el
  // contenido). En backend lo garantizan las políticas de Storage y de review_comments.
  return {
    ...detail,
    versions: detail.versions.map((v) => ({ ...v, pdfUrl: null, sourceUrl: null, comments: [] })),
  }
}

// ---------- Riesgos ----------

function assessmentOf(r: RiskSummaryRow, kind: AssessmentKind) {
  return kind === "inherente" ? r.inherent : r.residual ?? r.inherent
}

function filterRisks(f: RiskFilters): Risk[] {
  const q = f.q?.trim().toLocaleLowerCase("es")
  const kind = f.kind ?? "residual"
  return db.risks.filter((r) => {
    const a = assessmentOf(r, kind)
    const cellOk = (() => {
      if (!f.cell) return true
      const [p, i] = f.cell.split("-").map(Number)
      const full = r.assessments.find((x) => x.kind === kind) ?? r.assessments[0]
      return full.probability === p && full.impact === i
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
  const empty = await simulate()
  const kind = f.kind ?? "residual"
  const dir = (f.dir ?? (f.sort && f.sort !== "level" ? "asc" : "desc")) === "desc" ? -1 : 1
  const compare = (a: RiskSummaryRow, b: RiskSummaryRow) =>
    f.sort === "code"
      ? a.code.localeCompare(b.code, "es", { numeric: true })
      : f.sort === "process"
        ? a.processName.localeCompare(b.processName, "es")
        : assessmentOf(a, kind).score - assessmentOf(b, kind).score
  const rows = empty
    ? []
    : filterRisks(f).sort((a, b) => compare(a, b) * dir || a.code.localeCompare(b.code, "es", { numeric: true }))
  const page = Math.max(1, f.page ?? 1)
  const items: RiskSummaryRow[] = rows
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ cause: _c, consequence: _q, ownerPositionName: _o, status: _s, assessments: _a, controls: _k, ...row }) => row)
  return { items, total: rows.length, page, pageSize: PAGE_SIZE }
}

export async function listRiskCategories(): Promise<string[]> {
  if (await simulate()) return []
  return [...new Set(db.risks.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "es"))
}

/** Matriz P×I con los filtros de proceso y categoría (no se filtra por celda ni nivel). */
export async function getRiskMatrix(f: RiskFilters): Promise<RiskMatrix> {
  const empty = await simulate()
  const kind = f.kind ?? "residual"
  const rows = empty ? [] : filterRisks({ processId: f.processId, category: f.category, kind })
  const counts = Array.from({ length: 5 }, () => Array<number>(5).fill(0))
  const byLevel = Object.fromEntries(RISK_LEVELS.map((l) => [l, 0])) as Record<RiskLevel, number>
  for (const r of rows) {
    const a = r.assessments.find((x) => x.kind === kind) ?? r.assessments[0]
    counts[a.probability - 1][a.impact - 1]++
    byLevel[a.level]++
  }
  const controls = rows.flatMap((r) => r.controls)
  const onTime = controls.filter((c) => !c.overdue).length
  return {
    kind,
    counts,
    total: rows.length,
    byLevel,
    controlsOnTimePct: controls.length ? Math.round((onTime / controls.length) * 100) : 0,
  }
}

export async function getRisk(id: string): Promise<Risk | null> {
  await simulate()
  return db.risks.find((r) => r.id === id) ?? null
}

/** Todas las filas filtradas, sin paginar (exportación CSV de la matriz). */
export async function listAllRisks(f: RiskFilters): Promise<Risk[]> {
  if (await simulate()) return []
  return filterRisks(f)
}

// ---------- Administración ----------

export async function listMembers(): Promise<Member[]> {
  if (await simulate()) return []
  return db.members
}

export async function getRecertification(): Promise<RecertificationInfo> {
  const empty = await simulate()
  return {
    periodDays: db.recertification.periodDays,
    nextDueDate: db.recertification.nextDueDate,
    items: empty ? [] : [...db.recertification.items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  }
}

export async function listAuditLog(f: AuditFilters): Promise<AuditEntry[]> {
  if (await simulate()) return []
  return db.auditLog
    .filter(
      (e) =>
        (!f.from || e.at >= f.from) &&
        (!f.to || e.at.slice(0, 10) <= f.to) &&
        (!f.actor || e.actorName === f.actor) &&
        (!f.action || e.action === f.action) &&
        (!f.entityType || e.entityType === f.entityType)
    )
    .sort((a, b) => b.at.localeCompare(a.at))
}

export async function listOrganizations(): Promise<Organization[]> {
  if (await simulate()) return []
  return db.organizations
}

export async function getInvitation(token: string): Promise<Invitation | null> {
  await new Promise((r) => setTimeout(r, 150))
  return db.invitations[token] ?? null
}
