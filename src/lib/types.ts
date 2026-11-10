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
  | "ejecutar_accion_nc"
  | "conducir_auditoria"
  | "capturar_medicion"

export type TaskCategory = "documentos" | "riesgos" | "accesos" | "mejora"

// ---------- No Conformidades / CAPA (ISO 9001 cap. 10.2) ----------

export type NcSource =
  | "auditoria_interna"
  | "auditoria_externa"
  | "queja_pqrs"
  | "producto_servicio"
  | "riesgo_materializado"
  | "mejora"
  | "indicador"
  | "otro"

export type NcSeverity = "observacion" | "menor" | "mayor"

export type NcStatus =
  | "abierta"
  | "analisis_causa"
  | "plan_accion"
  | "en_ejecucion"
  | "verificacion"
  | "cerrada"
  | "anulada"

export type NcActionType = "correccion" | "correctiva" | "preventiva"
export type NcActionStatus = "pendiente" | "en_curso" | "hecha" | "cancelada"

/** Fila del tablero de no conformidades. */
export interface NcListItem {
  id: string
  code: string
  title: string
  processName: string | null
  source: NcSource
  severity: NcSeverity
  status: NcStatus
  reopened: boolean
  overdueActions: number
  detectedAt: string
}

export interface NcSummary {
  open: number
  inVerification: number
  overdueActions: number
  bySeverity: Record<NcSeverity, number>
}

export interface NcEvidenceView {
  id: string
  fileName: string
  registeredByName: string
  registeredAt: string
  note: string | null
  /** URL firmada de descarga (corta). null si no se pudo firmar. */
  url: string | null
}

export interface NcActionView {
  id: string
  type: NcActionType
  description: string
  responsiblePositionName: string
  dueDate: string
  status: NcActionStatus
  completedAt: string | null
  overdue: boolean
  evidences: NcEvidenceView[]
}

export interface NcTimelineEvent {
  at: string
  actor: string
  text: string
}

export interface NcVerification {
  verifiedByName: string
  verifiedAt: string
  effective: boolean
  notes: string | null
}

/** Ficha completa de una no conformidad. */
export interface NcDetail {
  id: string
  code: string
  title: string
  description: string
  processName: string | null
  source: NcSource
  severity: NcSeverity
  status: NcStatus
  reopenedCount: number
  ownerPositionName: string | null
  reportedByName: string
  detectedAt: string
  rootCause: string | null
  sourceRiskCode: string | null
  actions: NcActionView[]
  verification: NcVerification | null
  timeline: NcTimelineEvent[]
  /** Si el usuario actual puede gestionar (Líder SIG o Líder del proceso). */
  canManage: boolean
}

// ---------- Auditorías internas (ISO 9001 9.2) ----------

export type AuditStatus = "planificada" | "en_ejecucion" | "cerrada" | "cancelada"
export type FindingType = "no_conformidad" | "observacion" | "oportunidad_mejora" | "conformidad"
export type FindingSeverity = "menor" | "mayor"

/** Fila del tablero de auditorías. */
export interface AuditListItem {
  id: string
  code: string
  title: string
  processNames: string[]
  leadAuditorName: string | null
  plannedDate: string
  status: AuditStatus
  findingCount: number
}

export interface AuditSummary {
  planned: number
  inProgress: number
  closedThisYear: number
  ncFindings: number
}

export interface AuditFindingView {
  id: string
  type: FindingType
  severity: FindingSeverity | null
  processName: string | null
  description: string
  criteriaRef: string | null
  /** Código de la NC generada desde este hallazgo, si existe. */
  nonconformityCode: string | null
}

/** Ficha completa de una auditoría. */
export interface AuditDetail {
  id: string
  code: string
  title: string
  objective: string | null
  criteria: string | null
  processNames: string[]
  leadAuditorName: string | null
  plannedDate: string
  status: AuditStatus
  conclusions: string | null
  findings: AuditFindingView[]
  timeline: NcTimelineEvent[]
  /** Líder SIG: planificar/iniciar/cerrar/cancelar/generar NC. */
  canManage: boolean
  /** Rol auditor o líder: registrar hallazgos (solo en ejecución). */
  canAddFinding: boolean
}

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

// ---------- Indicadores de gestión / KPIs (ISO 9001 9.1) ----------

export type IndicatorDirection = "mayor_mejor" | "menor_mejor" | "rango"
export type IndicatorFrequency = "mensual" | "bimestral" | "trimestral" | "semestral" | "anual"
export type ComplianceStatus = "cumple" | "en_riesgo" | "no_cumple"
export type IndicatorStatus = "activo" | "archivado"

/** Punto de la mini-tendencia (sparkline) y de la gráfica. */
export interface TrendPoint {
  period: string
  value: number
  compliance: ComplianceStatus
}

/** Fila del tablero de indicadores. */
export interface IndicatorListItem {
  id: string
  code: string
  name: string
  processName: string | null
  unit: string
  direction: IndicatorDirection
  target: number
  targetMax: number | null
  frequency: IndicatorFrequency
  status: IndicatorStatus
  /** Último valor y su periodo; null si aún no hay mediciones. */
  lastValue: number | null
  lastPeriod: string | null
  /** Cumplimiento del último periodo; null si no hay medición. */
  lastCompliance: ComplianceStatus | null
  /** Serie para el sparkline (orden ascendente por periodo). */
  trend: TrendPoint[]
}

export interface IndicatorSummary {
  active: number
  /** % de indicadores activos con medición del periodo vigente en cumple. */
  compliancePct: number | null
  atRisk: number
  notMeeting: number
  /** Activos sin medición del periodo vigente. */
  withoutMeasurement: number
}

export interface IndicatorMeasurementView {
  id: string
  period: string
  value: number
  numerator: number | null
  denominator: number | null
  compliance: ComplianceStatus
  note: string | null
  capturedByName: string
  /** Código de la NC generada desde esta medición, si existe. */
  nonconformityCode: string | null
}

export interface IndicatorDetail {
  id: string
  code: string
  name: string
  processName: string | null
  description: string | null
  unit: string
  direction: IndicatorDirection
  target: number
  targetMax: number | null
  tolerancePct: number | null
  frequency: IndicatorFrequency
  ownerName: string | null
  isRate: boolean
  status: IndicatorStatus
  lastCompliance: ComplianceStatus | null
  lastPeriod: string | null
  measurements: IndicatorMeasurementView[]
  timeline: NcTimelineEvent[]
  /** Líder SIG: crear/editar/archivar la ficha. */
  canManage: boolean
  /** Líder SIG o líder del proceso dueño: registrar mediciones / generar NC. */
  canMeasure: boolean
}

// ---------- Revisión por la dirección (ISO 9001 9.3) ----------

export type ReviewStatus = "borrador" | "cerrada" | "cancelada"
export type ReviewOutputKind = "decision" | "accion_mejora" | "recurso" | "cambio_sgc"

/** Foto de las entradas automáticas (9.3.2) al momento de la revisión. */
export interface ReviewSnapshot {
  nc: { abiertas: number; cerradas: number; eficaces: number }
  auditorias: { realizadas: number; hallazgosNc: number }
  indicadores: { cumplenPct: number | null; enRiesgo: number; noCumplen: number }
  riesgos: { altos: number; controlesATiempoPct: number | null }
  documentos: { vigentes: number; porVencer: number }
  accionesPrevias: { total: number; pendientes: number }
}

/** Entradas de texto (9.3.2) que no viven en la app. */
export interface ReviewInputs {
  satisfaccion: string
  retroalimentacion: string
  proveedores: string
  recursos: string
  mejora: string
}

export interface ReviewOutputView {
  id: string
  kind: ReviewOutputKind
  description: string
  responsibleName: string | null
  dueDate: string | null
  /** Código de la NC generada desde esta decisión, si existe. */
  nonconformityCode: string | null
}

export interface ReviewListItem {
  id: string
  code: string
  title: string
  periodStart: string
  periodEnd: string
  meetingDate: string
  status: ReviewStatus
  outputCount: number
}

export interface ReviewDetail {
  id: string
  code: string
  title: string
  periodStart: string
  periodEnd: string
  meetingDate: string
  attendees: string | null
  scope: string | null
  status: ReviewStatus
  snapshot: ReviewSnapshot
  inputs: ReviewInputs
  outputs: ReviewOutputView[]
  /** Firma del cierre (ADR-004); null si aún en borrador. */
  approvedByName: string | null
  approvedAt: string | null
  cancelReason: string | null
  timeline: NcTimelineEvent[]
  /** Líder SIG: editar entradas, agregar salidas, refrescar snapshot, cerrar/firmar, cancelar. */
  canManage: boolean
}

// ---------- Competencias (ISO 7.2 / 7.3) ----------

export type CompetencyKind = "educacion" | "formacion" | "habilidad" | "experiencia"
/** Nivel requerido del perfil del cargo. */
export type CompetencyLevel = 1 | 2 | 3
/** Nivel evaluado de la persona (0 = sin nivel). */
export type AssessedLevel = 0 | 1 | 2 | 3
export type CompetencyStatus = "cumple" | "brecha" | "brecha_en_plan" | "sin_evaluar"
export type TrainingKind = "interna" | "externa"
export type TrainingResult = "aprobado" | "no_aprobado" | "asistio"

/** Competencia del catálogo de la organización. */
export interface CompetencyListItem {
  id: string
  name: string
  description: string | null
  kind: CompetencyKind
  isActive: boolean
  /** Nº de cargos cuyo perfil la exige. */
  positionCount: number
}

/** Requisito del perfil de un cargo: una competencia con su nivel. */
export interface PositionRequirement {
  id: string
  competencyId: string
  competencyName: string
  kind: CompetencyKind
  requiredLevel: CompetencyLevel
  isMandatory: boolean
  note: string | null
}

export interface PositionProfileDetail {
  positionId: string
  positionName: string
  processName: string | null
  requirements: PositionRequirement[]
}

/** Formación en la lista de /app/competencias/formacion. */
export interface TrainingListItem {
  id: string
  title: string
  kind: TrainingKind
  provider: string | null
  trainingDate: string
  hours: number | null
  attendeeCount: number
}

/** Una formación tomada por una persona (fila de la ficha). */
export interface TrainingAttendeeView {
  id: string
  trainingId: string
  title: string
  kind: TrainingKind
  provider: string | null
  trainingDate: string
  hours: number | null
  result: TrainingResult
  hasCertificate: boolean
  certificateName: string | null
  validUntil: string | null
}

/** Fila de la ficha de persona: requerido (perfil) vs. evaluado. */
export interface PersonCompetencyRow {
  competencyId: string
  competencyName: string
  kind: CompetencyKind
  requiredLevel: CompetencyLevel
  assessedLevel: AssessedLevel | null
  status: CompetencyStatus
  nextReviewDate: string | null
  /** Id de la tarea de cierre de brecha, si ya se creó. */
  gapTaskId: string | null
}

/** Celda de la matriz (persona × competencia). */
export interface MatrixCell {
  competencyId: string
  requiredLevel: CompetencyLevel
  assessedLevel: AssessedLevel | null
  status: CompetencyStatus
}

export interface MatrixRow {
  membershipId: string
  personName: string
  positionName: string
  processName: string | null
  cells: MatrixCell[]
}

/** Matriz derivada: columnas de competencia + filas por persona, agrupables por proceso. */
export interface CompetencyMatrix {
  columns: { competencyId: string; competencyName: string; kind: CompetencyKind }[]
  rows: MatrixRow[]
}

export interface CompetencySummary {
  /** % de competencias obligatorias cumplidas sobre las requeridas (alcance visible). */
  coveragePct: number | null
  openGaps: number
  certificatesDueSoon: number
}

export interface PersonCompetencyDetail {
  membershipId: string
  positionId: string | null
  personName: string
  positionName: string
  processName: string | null
  competencies: PersonCompetencyRow[]
  trainings: TrainingAttendeeView[]
  timeline: NcTimelineEvent[]
  /** Líder SIG o Líder del proceso del cargo: evaluar y registrar formación. */
  canManage: boolean
  /** La ficha es del propio usuario (solo lectura aunque no gestione). */
  isSelf: boolean
}

// ---------- Proveedores (ISO 8.4) ----------

export type SupplierKind = "bien" | "servicio" | "ambos"
export type SupplierCriticality = "alta" | "media" | "baja"
export type SupplierStatus = "pendiente" | "aprobado" | "condicionado" | "rechazado" | "inactivo"
export type EvaluationKind = "inicial" | "periodica"
export type EvaluationResult = "aprobado" | "condicionado" | "rechazado"

export interface SupplierListItem {
  id: string
  code: string
  name: string
  kind: SupplierKind
  criticality: SupplierCriticality
  status: SupplierStatus
  processName: string | null
  nextEvalDate: string | null
}

export interface SupplierSummary {
  approved: number
  conditionedOrRejected: number
  /** Activos con reevaluación vencida o dentro de 30 días. */
  dueForReeval: number
}

export interface SupplierEvaluationView {
  id: string
  kind: EvaluationKind
  evalDate: string
  scoreQuality: number
  scoreDelivery: number
  scoreService: number
  totalScore: number
  result: EvaluationResult
  nextEvalDate: string | null
  note: string | null
  evaluatedBy: string | null
}

export interface SupplierDetail {
  id: string
  code: string
  name: string
  nit: string | null
  kind: SupplierKind
  category: string | null
  criticality: SupplierCriticality
  processName: string | null
  processId: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  status: SupplierStatus
  isActive: boolean
  /** Puntaje y resultado de la última evaluación; null si aún Pendiente. */
  lastScore: number | null
  lastResult: EvaluationResult | null
  nextEvalDate: string | null
  evaluations: SupplierEvaluationView[]
  timeline: NcTimelineEvent[]
  /** Líder SIG o Líder del proceso del proveedor: registrar/editar/evaluar/baja. */
  canManage: boolean
}

// ---------- PQRS y satisfacción del cliente (ISO 9.1.2) ----------

export type PqrsType = "peticion" | "queja" | "reclamo" | "sugerencia" | "felicitacion"
export type PqrsChannel = "correo" | "telefono" | "web" | "presencial" | "otro"
export type PqrsStatus = "recibida" | "en_gestion" | "resuelta" | "cerrada" | "anulada"
export type SatisfactionMethod = "encuesta" | "nps" | "csat" | "otro"

export interface PqrsListItem {
  id: string
  code: string
  type: PqrsType
  customerName: string | null
  status: PqrsStatus
  processName: string | null
  dueDate: string
}

export interface SatisfactionMeasurementView {
  id: string
  period: string
  method: SatisfactionMethod
  score: number
  responses: number | null
  note: string | null
}

export interface PqrsSummary {
  /** Casos en estado recibida/en_gestion/resuelta. */
  open: number
  /** Casos abiertos con due_date vencida. */
  overdue: number
  lastSatisfactionScore: number | null
  lastSatisfactionPeriod: string | null
}

export interface PqrsDetail {
  id: string
  code: string
  type: PqrsType
  channel: PqrsChannel
  customerName: string | null
  customerContact: string | null
  processName: string | null
  processId: string | null
  description: string
  receivedDate: string
  dueDate: string
  status: PqrsStatus
  responsibleName: string | null
  response: string | null
  satisfied: boolean | null
  /** Código de la NC generada desde un reclamo, si existe. */
  nonconformityCode: string | null
  timeline: NcTimelineEvent[]
  /** Líder SIG o Líder del proceso del caso: gestionar, responder, cerrar, anular, generar NC. */
  canManage: boolean
}

// ---------- Actas/reuniones y Objetivos de calidad / BSC (ISO 6.2) ----------

export type MinuteStatus = "borrador" | "cerrada"
export type CommitmentStatus = "pendiente" | "cumplido"
export type Perspective = "financiera" | "cliente" | "procesos" | "aprendizaje"
export type ObjectiveStatus = "activo" | "cumplido" | "no_cumplido" | "archivado"

export interface MinuteListItem {
  id: string
  code: string
  title: string
  meetingType: string
  meetingDate: string
  processName: string | null
  status: MinuteStatus
  commitmentCount: number
  pendingCount: number
}

export interface MinutesSummary {
  /** Actas con fecha de reunión del año en curso. */
  totalYear: number
  /** Actas en estado borrador. */
  drafts: number
  /** Compromisos pendientes en todas las actas visibles. */
  pendingCommitments: number
}

export interface CommitmentView {
  id: string
  description: string
  responsibleName: string | null
  dueDate: string | null
  status: CommitmentStatus
}

export interface MinuteDetail {
  id: string
  code: string
  title: string
  meetingType: string
  meetingDate: string
  processId: string | null
  processName: string | null
  /** Lista de asistentes (dato personal). */
  attendees: string | null
  /** Temas / orden del día. */
  agenda: string | null
  status: MinuteStatus
  commitments: CommitmentView[]
  timeline: NcTimelineEvent[]
  /** Líder SIG o Líder del proceso del acta: editar, cerrar, agregar/cumplir compromisos. */
  canManage: boolean
}

/** Indicador disponible para ligar a un objetivo (multi-select). */
export interface ObjectiveIndicatorRef {
  id: string
  name: string
}

export interface ObjectiveCardView {
  id: string
  code: string
  description: string
  perspective: Perspective
  processName: string | null
  processId: string | null
  targetText: string | null
  horizonYear: number | null
  status: ObjectiveStatus
  /** Indicadores ligados. */
  indicatorCount: number
  /** Avance derivado (% de indicadores ligados que cumplen) o null = sin datos. */
  progressPct: number | null
  /** Ids de los indicadores ligados (para precargar el multi-select al editar). */
  indicatorIds: string[]
  canManage: boolean
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
