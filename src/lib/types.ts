// Tipos de vista de CrubolDocs. Reflejan el modelo de docs/ARQUITECTURA.md en la
// forma que consumirá la UI; el backend (Supabase) debe devolver exactamente esto.
// Fechas: cadenas ISO 8601 (serializables entre servidor y cliente).

export type Role =
  | "lider_sig"
  | "lider_proceso"
  | "elaborador"
  | "revisor"
  | "aprobador"
  | "responsable_control"
  | "auditor"
  | "consulta"

/** Rol otorgado a un cargo; `processId` null = alcance en todos los procesos. */
export interface PositionRole {
  role: Role
  processId: string | null
}

export interface PersonRef {
  id: string
  fullName: string
  positionName: string
}

// ---------- Identidad y organización ----------

export interface OrganizationRef {
  id: string
  name: string
}

export interface CurrentUser {
  id: string
  fullName: string
  email: string
  positionId: string | null
  positionName: string | null
  organization: OrganizationRef
  /** Otras organizaciones a las que pertenece (para el selector del topbar). */
  organizations: OrganizationRef[]
  isOrgAdmin: boolean
  isPlatformAdmin: boolean
  isExternal: boolean
  validUntil: string | null
  roles: PositionRole[]
}

export type OrganizationStatus = "activa" | "suspendida"

export interface Organization {
  id: string
  name: string
  nit: string
  status: OrganizationStatus
  userCount: number
  createdAt: string
  /** Invitación del administrador inicial aún sin aceptar (el Superadmin puede reenviarla). */
  pendingAdminInvitationId: string | null
}

export type ProcessType = "estrategico" | "misional" | "apoyo" | "evaluacion"

export interface Process {
  id: string
  code: string
  name: string
  type: ProcessType
  leaderPositionId: string | null
  leaderPositionName: string | null
  documentCount: number
}

export interface DocumentType {
  id: string
  code: string
  name: string
  documentCount: number
}

export interface Position {
  id: string
  name: string
  processId: string | null
  processName: string | null
  roles: PositionRole[]
  holders: PersonRef[]
}

// ---------- Control documental ----------

export type DocumentStatus = "borrador" | "en_revision" | "en_aprobacion" | "vigente" | "obsoleto"
export type VersionStatus = "borrador" | "en_revision" | "en_aprobacion" | "aprobada" | "reemplazada"

export interface DocumentSummary {
  id: string
  code: string
  title: string
  processId: string
  processName: string
  typeId: string
  typeCode: string
  status: DocumentStatus
  currentVersionNo: number
  nextReviewDate: string | null
  reviewOverdue: boolean
}

export interface DocumentFilters {
  q?: string
  processId?: string
  typeId?: string
  statuses?: DocumentStatus[]
  reviewOverdue?: boolean
  sort?: "code" | "title" | "nextReview"
  dir?: "asc" | "desc"
  page?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ReviewComment {
  id: string
  author: PersonRef
  body: string
  createdAt: string
  resolvedAt: string | null
}

export type SignatureAction = "revision" | "aprobacion"

export interface Signature {
  id: string
  signer: PersonRef
  action: SignatureAction
  meaning: string
  signedAt: string
  ip: string
  signatureHash: string
}

export interface ReadAcknowledgement {
  userId: string
  positionName: string
  userName: string
  acknowledgedAt: string | null
}

export interface DocumentVersion {
  id: string
  versionNo: number
  status: VersionStatus
  changeSummary: string
  /** URL firmada de corta duración; null si el usuario no puede ver contenido. */
  pdfUrl: string | null
  sourceUrl: string | null
  sourceFileName: string
  pdfSha256: string
  pageCount: number
  elaboratedBy: PersonRef
  reviewedBy: PersonRef | null
  approvedBy: PersonRef | null
  approvedAt: string | null
  effectiveDate: string | null
  comments: ReviewComment[]
  signatures: Signature[]
  reads: ReadAcknowledgement[]
}

export type ChangeRequestStatus = "abierta" | "aceptada" | "rechazada"

export interface ChangeRequest {
  id: string
  requestedBy: PersonRef
  reason: string
  status: ChangeRequestStatus
  createdAt: string
  resolvedBy: PersonRef | null
  resolution: string | null
}

export interface DocumentDetail extends DocumentSummary {
  typeName: string
  elaboradorPositionId: string
  elaboradorPositionName: string
  revisorPositionId: string
  revisorPositionName: string
  aprobadorPositionId: string
  aprobadorPositionName: string
  reviewEveryMonths: number
  readRequired: boolean
  distributionPositionIds: string[]
  distributionCount: number
  /** Ordenadas de la más reciente a la más antigua. */
  versions: DocumentVersion[]
  changeRequests: ChangeRequest[]
}

// ---------- Bandeja ----------

export type TaskType =
  | "revisar"
  | "aprobar"
  | "corregir"
  | "atender_solicitud"
  | "confirmar_lectura"
  | "ejecutar_control"
  | "revisar_documento_vencido"
  | "recertificar_accesos"

export type TaskCategory = "documentos" | "riesgos" | "accesos"

export interface Task {
  id: string
  type: TaskType
  /** Código de la entidad (documento o riesgo); null en tareas de accesos. */
  entityCode: string | null
  title: string
  versionNo: number | null
  detail: string | null
  dueDate: string
  assigneePositionName: string
  originName: string | null
  href: string
}

export interface HomeSummary {
  pendingTasks: number
  overdueTasks: number
  documentsDueForReview30d: number
  /** null si el usuario no tiene roles de riesgos. */
  pendingControls: number | null
}

export interface SetupProgress {
  hasProcesses: boolean
  hasPositionsWithRoles: boolean
  hasInvitedUsers: boolean
}

export interface ActivityEvent {
  id: string
  actorName: string
  description: string
  entityCode: string | null
  at: string
}

// ---------- Riesgos ----------

export type RiskLevel = "bajo" | "moderado" | "alto" | "extremo"
export type AssessmentKind = "inherente" | "residual"

export interface RiskAssessment {
  id: string
  kind: AssessmentKind
  probability: number
  impact: number
  score: number
  level: RiskLevel
  assessedBy: PersonRef
  assessedAt: string
}

export type ControlType = "preventivo" | "detectivo" | "correctivo"
export type EvidenceResult = "efectivo" | "no_efectivo"

export interface ControlEvidence {
  id: string
  executedAt: string
  result: EvidenceResult
  notes: string
  fileName: string | null
  registeredBy: PersonRef
}

export interface Control {
  id: string
  description: string
  type: ControlType
  frequency: string
  responsiblePositionId: string
  responsiblePositionName: string
  nextDueDate: string
  overdue: boolean
  lastEvidence: ControlEvidence | null
}

export interface RiskSummaryRow {
  id: string
  code: string
  description: string
  processId: string
  processName: string
  category: string
  inherent: { score: number; level: RiskLevel }
  residual: { score: number; level: RiskLevel } | null
  controlCount: number
  overdueControlCount: number
}

export interface Risk extends RiskSummaryRow {
  cause: string
  consequence: string
  ownerPositionName: string
  status: "activo" | "cerrado"
  /** Historial completo, del más reciente al más antiguo. */
  assessments: RiskAssessment[]
  controls: Control[]
}

export interface RiskFilters {
  q?: string
  processId?: string
  category?: string
  level?: RiskLevel
  overdueControls?: boolean
  kind?: AssessmentKind
  /** Celda de la matriz seleccionada, formato "P-I" (p. ej. "3-4"). */
  cell?: string
  /** Orden de la lista; por defecto nivel de la vista activa, descendente. */
  sort?: "level" | "code" | "process"
  dir?: "asc" | "desc"
}

export interface RiskMatrix {
  kind: AssessmentKind
  /** counts[p-1][i-1] = número de riesgos con probabilidad p e impacto i. */
  counts: number[][]
  total: number
  byLevel: Record<RiskLevel, number>
  controlsOnTimePct: number
}

// ---------- Administración ----------

export type MembershipStatus = "activo" | "invitado" | "vencido" | "revocado"

export interface Member {
  membershipId: string
  userId: string | null
  fullName: string | null
  email: string
  positionId: string
  positionName: string
  isOrgAdmin: boolean
  isExternal: boolean
  validUntil: string | null
  status: MembershipStatus
  invitedAt: string | null
}

export interface RecertificationItem {
  membershipId: string
  fullName: string
  email: string
  positionName: string
  isExternal: boolean
  lastRecertifiedAt: string | null
  dueDate: string
  overdue: boolean
}

export interface RecertificationInfo {
  periodDays: number
  nextDueDate: string
  items: RecertificationItem[]
}

export interface AuditEntry {
  id: string
  at: string
  actorName: string
  action: string
  entityType: string
  entityLabel: string
  diff: Record<string, { before: string | null; after: string | null }>
}

export interface AuditFilters {
  from?: string
  to?: string
  actor?: string
  action?: string
  entityType?: string
}

export type InvitationStatus = "valida" | "vencida" | "usada"

export interface Invitation {
  organizationName: string
  positionName: string
  email: string
  isExternal: boolean
  validUntil: string | null
  status: InvitationStatus
  /** El correo invitado ya tiene cuenta: se acepta ingresando con ella, no creando otra. */
  accountExists: boolean
}

// ---------- Resultado de mutaciones ----------

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }
