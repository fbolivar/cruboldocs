// Tipos de vista de CrubolDocs. Reflejan el modelo de docs/ARQUITECTURA.md en la
// forma que consumirá la UI; el backend (Supabase) debe devolver exactamente esto.
// Fechas: cadenas ISO 8601 (serializables entre servidor y cliente).

import type { ReportConfig } from "@/lib/bi/datasets"

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
  /** Idioma preferido de la interfaz (v1.4-4). */
  locale: Locale
}

/** Idiomas soportados por la interfaz. */
export type Locale = "es" | "en"

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
  /** Multi-idioma (v1.4-4): título mostrado según el idioma del usuario y datos para editarlo. */
  localizedTitle: string
  /** true si se muestra el título original por falta de traducción (solo con idioma ≠ original). */
  titleFallback: boolean
  /** Traducción al inglés del título (vacío si no hay); para el editor de traducciones. */
  titleEn: string
  /** Puede gestionar traducciones (elaborador/líder SIG/líder del proceso). */
  canTranslate: boolean
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
  /** Análisis de causa raíz estructurado (v1.5-2); null si aún no hay. */
  rca: RcaAnalysisView | null
}

// ---------- Causa raíz estructurada (v1.5-2) ----------

export type RcaMethod = "5porques" | "ishikawa"

export interface FiveWhysData {
  problem: string
  steps: string[]
}

export interface IshikawaData {
  categories: { metodo: string[]; maquina: string[]; mano_obra: string[]; material: string[]; medio: string[]; medicion: string[] }
}

export interface RcaAnalysisView {
  method: RcaMethod
  /** Estructura del método: FiveWhysData o IshikawaData (según `method`). */
  data: FiveWhysData | IshikawaData
  conclusion: string | null
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
  /** Portal externo (v1.4-3): enlace vigente de autoevaluación y respuestas recibidas. */
  selfAssessmentToken: string | null
  selfAssessments: SupplierSelfAssessmentView[]
  /** SCAR (v1.5-3): solicitudes de acción correctiva de este proveedor. */
  scars: ScarView[]
}

// ---------- Inspecciones / Control de calidad (v1.6-1) ----------

export type InspectionType = "recepcion" | "proceso" | "final"
export type InspectionDisposition = "pendiente" | "aceptado" | "rechazado" | "concesion"
export type CharacteristicType = "numerico" | "pasa_falla"

export interface InspectionCharacteristic {
  name: string
  type: CharacteristicType
  unit?: string | null
  min?: number | null
  max?: number | null
}

export interface InspectionPlanView {
  id: string
  name: string
  description: string | null
  processName: string | null
  processId: string | null
  isActive: boolean
  characteristics: InspectionCharacteristic[]
}

export interface InspectionPlanOption {
  id: string
  name: string
  processId: string | null
  characteristics: InspectionCharacteristic[]
}

export interface InspectionSummary {
  pending: number
  rejected: number
  /** % de aceptación (aceptadas+concesión / con disposición); null si no hay cerradas. */
  acceptanceRate: number | null
}

export interface InspectionListItem {
  id: string
  code: string
  type: InspectionType
  disposition: InspectionDisposition
  planName: string
  supplierName: string | null
  processName: string | null
  inspectedAt: string
}

export interface InspectionResultView {
  name: string
  type: CharacteristicType
  unit: string | null
  min: number | null
  max: number | null
  value: number | null
  passed: boolean | null
  ok: boolean
}

export interface InspectionDetail {
  id: string
  code: string
  type: InspectionType
  disposition: InspectionDisposition
  planName: string
  supplierName: string | null
  processName: string | null
  lotRef: string | null
  lotSize: number | null
  sampleSize: number | null
  defects: number
  acceptanceNumber: number | null
  note: string | null
  inspectedAt: string
  results: InspectionResultView[]
  ncCode: string | null
  ncOutputCode: string | null
  timeline: NcTimelineEvent[]
  canManage: boolean
}

// ---------- Incidentes/accidentes SST (v1.6-2) ----------

export type IncidentKind = "accidente" | "incidente" | "casi_accidente"
export type IncidentSeverity = "sin_lesion" | "leve" | "grave" | "mortal"
export type IncidentStatus = "reportado" | "en_investigacion" | "cerrado" | "anulado"

export interface IncidentSummary {
  open: number
  accidents: number
  /** Accidentes con investigación vencida (investigation_due pasada y sin cerrar). */
  overdueInvestigations: number
}

export interface IncidentListItem {
  id: string
  code: string
  kind: IncidentKind
  severity: IncidentSeverity
  status: IncidentStatus
  processName: string | null
  location: string | null
  occurredAt: string
  investigationDue: string | null
  /** Accidente abierto con investigación vencida. */
  overdue: boolean
}

export interface IncidentDetail {
  id: string
  code: string
  kind: IncidentKind
  severity: IncidentSeverity
  status: IncidentStatus
  occurredAt: string
  location: string | null
  processId: string | null
  processName: string | null
  hazardId: string | null
  hazardName: string | null
  description: string
  immediateAction: string | null
  affectedName: string | null
  affectedDocument: string | null
  affectedPositionId: string | null
  affectedPositionName: string | null
  injury: string | null
  bodyPart: string | null
  lostDays: number | null
  investigatedByPositionId: string | null
  investigatedByPositionName: string | null
  investigationDue: string | null
  investigatedAt: string | null
  ncCode: string | null
  ncStatus: string | null
  overdue: boolean
  timeline: NcTimelineEvent[]
  canManage: boolean
}

// ---------- SCAR: solicitud de acción correctiva a proveedor (v1.5-3) ----------

export type ScarStatus = "enviada" | "respondida" | "aceptada" | "rechazada" | "anulada"

export interface ScarView {
  id: string
  code: string
  status: ScarStatus
  title: string
  description: string
  dueDate: string | null
  token: string
  ncCode: string | null
  rootCause: string | null
  actions: string | null
  commitDate: string | null
  reviewNotes: string | null
  reopenedCount: number
}

/** Autoevaluación enviada por un proveedor desde el enlace público (para revisión del SIG). */
export interface SupplierSelfAssessmentView {
  id: string
  score: number
  comment: string | null
  status: "recibida" | "revisada"
  submittedAt: string
}

// ---------- Notificaciones Slack/Teams (v1.4-7) ----------

export interface ChatNotifierView {
  id: string
  provider: "slack" | "teams"
  name: string
  /** URL enmascarada (el secreto no se expone). */
  maskedUrl: string
  events: string[]
  enabled: boolean
}

// ---------- BI / Constructor de informes (v1.4-6) ----------

export interface SavedReportView {
  id: string
  name: string
  description: string | null
  dataset: string
  scope: "privada" | "compartida"
  config: ReportConfig
  /** Lo creó el usuario actual. */
  isOwn: boolean
  /** Puede editar/eliminar (autor o Líder SIG). */
  canEdit: boolean
}

// ---------- BPM-lite: Solicitudes y aprobaciones (v1.4-5) ----------

export type SolicitudStatus = "pendiente" | "aprobada" | "rechazada" | "anulada"
export type StepDecision = "pendiente" | "aprobada" | "rechazada"

/** Paso de una plantilla de flujo (configuración en Admin). */
export interface FlowStepView {
  name: string
  positionId: string
  positionName: string
}

/** Plantilla de flujo para el gestor de Admin. */
export interface ApprovalFlowView {
  id: string
  name: string
  description: string | null
  isActive: boolean
  steps: FlowStepView[]
}

/** Opción de flujo activo para radicar una solicitud. */
export interface ApprovalFlowOption {
  id: string
  name: string
  stepCount: number
}

export interface SolicitudSummary {
  pending: number
  pendingForMe: number
  closed: number
}

export interface SolicitudListItem {
  id: string
  code: string
  title: string
  flowName: string
  status: SolicitudStatus
  currentStep: number
  totalSteps: number
  currentApproverName: string | null
  pendingForMe: boolean
  createdAt: string
}

export interface SolicitudStepView {
  stepNo: number
  name: string
  approverPositionName: string
  decision: StepDecision
  decidedByName: string | null
  decidedAt: string | null
  comment: string | null
  /** Paso actual en curso. */
  current: boolean
}

export interface SolicitudDetail {
  id: string
  code: string
  title: string
  description: string | null
  flowName: string
  status: SolicitudStatus
  requesterName: string
  createdAt: string
  steps: SolicitudStepView[]
  timeline: NcTimelineEvent[]
  /** El usuario es el cargo del paso actual y la solicitud está pendiente. */
  canDecide: boolean
  /** El usuario es el solicitante o Líder SIG y la solicitud está pendiente. */
  canCancel: boolean
}

// ---------- Portal externo (v1.4-3) ----------

/** Estado del buzón público de PQRS de la organización (control en /app/pqrs). */
export interface PqrsPortalView {
  enabled: boolean
  token: string | null
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

// ---------- Aspectos ambientales (v1.1-4b, ISO 14001) ----------

export type EnvCondition = "normal" | "anormal" | "emergencia"
export type EnvSignificance = "significativo" | "no_significativo"
export type EnvStatus = "activo" | "inactivo"

export interface EnvAspectListItem {
  id: string
  code: string
  aspect: string
  impact: string
  condition: EnvCondition
  processName: string | null
  score: number
  significance: EnvSignificance
  status: EnvStatus
}

export interface EnvAspectsSummary {
  active: number
  significant: number
  dueSoon: number
}

export interface EnvAspectDetail {
  id: string
  code: string
  processId: string | null
  processName: string | null
  activity: string
  aspect: string
  impact: string
  condition: EnvCondition
  controls: string | null
  legalRequirementId: string | null
  legalRequirementCode: string | null
  responsibleName: string | null
  freq: number
  sev: number
  reach: number
  legalCrit: number
  score: number
  significance: EnvSignificance
  status: EnvStatus
  nextReviewDate: string | null
  timeline: NcTimelineEvent[]
  canManage: boolean
}

// ---------- Multi-norma y peligros SST (v1.1-4) ----------

export type NormEntityType = "proceso" | "documento" | "riesgo" | "no_conformidad" | "objetivo" | "requisito_legal" | "peligro" | "aspecto_ambiental"

export interface Norm {
  id: string
  code: string
  name: string
  isActive: boolean
  taggedCount: number
}

/** Norma activa para los selectores de etiquetado. */
export interface NormOption {
  id: string
  code: string
  name: string
}

export type HazardClass = "fisico" | "quimico" | "biologico" | "biomecanico" | "psicosocial" | "seguridad" | "natural"
export type HazardStatus = "activo" | "inactivo"
export type HazardRiskLevel = "I" | "II" | "III" | "IV"

export interface HazardListItem {
  id: string
  code: string
  hazard: string
  classification: HazardClass
  processName: string | null
  area: string | null
  nr: number
  riskLevel: HazardRiskLevel
  status: HazardStatus
}

export interface HazardsSummary {
  active: number
  levelI: number
  dueSoon: number
}

export interface HazardDetail {
  id: string
  code: string
  processId: string | null
  processName: string | null
  area: string | null
  hazard: string
  classification: HazardClass
  existingControls: string | null
  nd: number
  ne: number
  nc: number
  np: number
  nr: number
  riskLevel: HazardRiskLevel
  intervention: string | null
  responsibleName: string | null
  status: HazardStatus
  nextReviewDate: string | null
  timeline: NcTimelineEvent[]
  canManage: boolean
}

// ---------- Requisitos legales (v1.1-3, ISO 14001/45001, SG-SST) ----------

export type LegalSource = "ley" | "decreto" | "resolucion" | "norma_iso" | "contractual" | "otro"
export type LegalCompliance = "cumple" | "parcial" | "no_cumple" | "no_evaluado"
export type LegalStatus = "vigente" | "derogado"
export type LegalFrequency = "semestral" | "anual" | "bienal"

export interface LegalRequirementListItem {
  id: string
  code: string
  title: string
  sourceType: LegalSource
  reference: string
  processName: string | null
  status: LegalStatus
  /** Cumplimiento vigente (derivado de la última evaluación). */
  compliance: LegalCompliance
  nextEvalDate: string | null
}

export interface LegalSummary {
  active: number
  notMeeting: number
  dueSoon: number
}

export interface LegalEvaluationView {
  id: string
  evaluatedAt: string
  compliance: Exclude<LegalCompliance, "no_evaluado">
  evidence: string
  evaluatedBy: string
  note: string | null
}

export interface LegalRequirementDetail {
  id: string
  code: string
  title: string
  sourceType: LegalSource
  reference: string
  issuer: string | null
  description: string
  processId: string | null
  processName: string | null
  url: string | null
  status: LegalStatus
  evalFrequency: LegalFrequency
  nextEvalDate: string | null
  compliance: LegalCompliance
  evaluations: LegalEvaluationView[]
  timeline: NcTimelineEvent[]
  canManage: boolean
}

// ---------- Encuesta de satisfacción enviable (v1.1-2, ISO 9.1.2) ----------

export type SurveyScale = "0_100" | "1_5" | "nps_0_10"
export type SurveyMethod = "encuesta" | "nps" | "csat"
export type SurveyStatus = "abierta" | "cerrada"

export interface SurveyCampaign {
  id: string
  code: string
  title: string
  method: SurveyMethod
  scale: SurveyScale
  period: string
  processName: string | null
  status: SurveyStatus
  responseCount: number
  avgScore: number | null
  /** Token para armar el link público (solo se entrega a quien gestiona). */
  token: string
}

/** Lectura pública mínima de una campaña por token. */
export interface PublicSurvey {
  title: string
  method: SurveyMethod
  scale: SurveyScale
  isOpen: boolean
}

// ---------- Tablero gerencial (v1.1-1, solo lectura) ----------

export interface DashboardFilters {
  /** Proceso (id) o null = todos. */
  processId: string | null
  /** Año del periodo (p. ej. 2026). */
  year: number
  /** Norma (id) o null = todas: acota a los procesos etiquetados con esa norma. */
  normId?: string | null
}

export interface DashboardProcessRef {
  id: string
  name: string
}

/** Barra con etiqueta y valor (HBar). */
export interface LabeledCount {
  label: string
  value: number
  /** tono opcional para realce semántico (p. ej. vencida). */
  tone?: "exito" | "advertencia" | "error" | "info" | "neutro"
}

export interface DashboardData {
  /** Año y proceso aplicados; y si hay algún dato en la organización. */
  year: number
  hasAnyData: boolean
  processes: DashboardProcessRef[]
  /** Normas activas de la organización (para el segmento del Tablero). */
  norms: NormOption[]
  nc: {
    open: number
    overdueActions: number
    byStatus: LabeledCount[]
    bySeverity: LabeledCount[]
  }
  audits: { plannedOrInProgress: number; closedThisYear: number }
  indicators: {
    active: number
    compliancePct: number | null
    cumple: number
    atRisk: number
    notMeeting: number
    withoutMeasurement: number
  }
  objectives: {
    active: number
    fulfilled: number
    /** avance por perspectiva BSC (pct null = sin datos). */
    byPerspective: { perspective: Perspective; avgProgress: number | null; count: number }[]
  }
  pqrs: { open: number; overdue: number }
  satisfaction: {
    lastScore: number | null
    lastPeriod: string | null
    /** últimos periodos (orden ascendente) para la tendencia. */
    trend: { period: string; score: number }[]
  }
  documents: { dueSoon: number }
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

// ---------- Constructor de formularios (v1.1-5) ----------

export type FormCategory = "inspeccion" | "lista_verificacion" | "formato" | "encuesta_interna" | "otro"
export type FormStatus = "borrador" | "publicado" | "archivado"
export type FieldType =
  | "texto" | "texto_largo" | "numero" | "fecha" | "si_no"
  | "seleccion" | "multiseleccion" | "puntaje" | "seccion" | "imagen"
export type SubmissionStatus = "borrador" | "enviada"

/** Valor de un campo diligenciado (jsonb): texto, número, booleano, fecha ISO o lista. */
export type FieldValue = string | number | boolean | string[] | null

export interface FormFieldView {
  id: string
  order: number
  type: FieldType
  label: string
  help: string | null
  required: boolean
  /** opciones de selección/multiselección. */
  options: string[] | null
  /** configuración por tipo (min/max de número o puntaje). */
  config: { min?: number; max?: number } | null
}

export interface FormTemplateListItem {
  id: string
  code: string
  title: string
  category: FormCategory
  status: FormStatus
  version: number
  processName: string | null
  fieldCount: number
  submissionCount: number
  canManage: boolean
}

export interface FormsSummary {
  total: number
  published: number
  submissionsThisMonth: number
}

export interface FormTemplateDetail {
  id: string
  code: string
  title: string
  description: string | null
  category: FormCategory
  status: FormStatus
  publishedVersion: number | null
  draftVersion: number
  /** hay un borrador editable por encima de lo publicado (o aún sin publicar). */
  hasOpenDraft: boolean
  processId: string | null
  processName: string | null
  /** campos de la versión vigente (borrador si hay, si no la publicada). */
  fields: FormFieldView[]
  submissionCount: number
  canManage: boolean
  canFill: boolean
  timeline: NcTimelineEvent[]
}

/** Formulario publicado listo para diligenciar (desde get_published_form). */
export interface PublishedForm {
  id: string
  code: string
  title: string
  category: FormCategory
  version: number
  fields: FormFieldView[]
}

export interface SubmissionListItem {
  id: string
  submittedByName: string
  templateVersion: number
  status: SubmissionStatus
  submittedAt: string | null
  createdAt: string
}

export interface SubmissionDetail {
  id: string
  status: SubmissionStatus
  submittedByName: string
  templateVersion: number
  submittedAt: string | null
  createdAt: string
  /** campos de la versión con que se diligenció, en orden. */
  fields: FormFieldView[]
  values: Record<string, FieldValue>
}

// ---------- SG-SST: Estándares Mínimos (Res. 0312) (v1.2-2) ----------

export type SstCycle = "planear" | "hacer" | "verificar" | "actuar"
export type SstComponent =
  | "recursos" | "gestion_integral" | "gestion_salud"
  | "peligros_riesgos" | "gestion_amenazas" | "verificacion" | "mejoramiento"
export type SstItemStatus = "pendiente" | "cumple" | "no_cumple" | "no_aplica"
export type SstRating = "critico" | "moderado" | "aceptable"
export type SstEvaluationStatus = "borrador" | "cerrada"
export type SstActionStatus = "pendiente" | "en_curso" | "hecha" | "cancelada"

export interface SstSummary {
  evaluationCode: string | null
  period: number | null
  tier: number | null
  score: number | null
  rating: SstRating | null
  cumple: number
  noCumple: number
  noAplica: number
  pendiente: number
  openActions: number
  overdueActions: number
}

export interface SstEvaluationListItem {
  id: string
  code: string
  period: number
  tier: number
  workerCount: number
  riskClass: number
  status: SstEvaluationStatus
  score: number | null
  rating: SstRating | null
}

export interface SstItemView {
  itemId: string
  standardId: string
  code: string
  name: string
  cycle: SstCycle
  component: SstComponent
  weight: number
  status: SstItemStatus
  justification: string | null
  /** El estándar aplica al nivel; si es false, está autocalificado al máximo (Res. 0312). */
  applicable: boolean
}

export interface SstPhaseTotal {
  cycle: SstCycle
  possible: number
  obtained: number
}

export interface SstActionView {
  id: string
  standardCode: string
  standardName: string
  description: string
  responsibleName: string | null
  dueDate: string | null
  status: SstActionStatus
  overdue: boolean
}

export interface SstEvaluationDetail {
  id: string
  code: string
  period: number
  tier: number
  workerCount: number
  riskClass: number
  status: SstEvaluationStatus
  score: number | null
  rating: SstRating | null
  canManage: boolean
  items: SstItemView[]
  phases: SstPhaseTotal[]
  actions: SstActionView[]
  timeline: NcTimelineEvent[]
}

// ---------- Metrología (7.1.5) (v1.2-3) ----------

export type MetrologyFrequency = "mensual" | "bimestral" | "trimestral" | "semestral" | "anual" | "bienal"
export type EquipmentStatus = "vigente" | "fuera_de_servicio"
export type EffectiveEquipmentStatus = "vigente" | "vencido" | "fuera_de_servicio"
export type CalibrationKind = "calibracion" | "verificacion"
export type CalibrationResult = "conforme" | "no_conforme" | "ajustado"

export interface MetrologySummary {
  active: number
  overdue: number
  dueSoon: number
}

export interface EquipmentListItem {
  id: string
  code: string
  name: string
  processName: string | null
  measurementRange: string | null
  nextDueDate: string | null
  status: EffectiveEquipmentStatus
}

export interface CalibrationView {
  id: string
  date: string
  kind: CalibrationKind
  result: CalibrationResult
  standardUsed: string | null
  certificateRef: string | null
  provider: string | null
  nextDueDate: string | null
  note: string | null
}

export interface EquipmentDetail {
  id: string
  code: string
  name: string
  type: string | null
  processId: string | null
  processName: string | null
  location: string | null
  measurementRange: string | null
  unit: string | null
  frequency: MetrologyFrequency
  lastCalibrationDate: string | null
  nextDueDate: string | null
  responsibleName: string | null
  status: EquipmentStatus
  effectiveStatus: EffectiveEquipmentStatus
  canManage: boolean
  calibrations: CalibrationView[]
  timeline: NcTimelineEvent[]
}

// ---------- Gestión del cambio (6.3) (v1.2-3) ----------

export type ChangeType = "proceso" | "documento" | "infraestructura" | "tecnologico" | "organizacional" | "otro"
export type ChangeStatus = "propuesto" | "en_evaluacion" | "aprobado" | "rechazado" | "implementado"

export interface ChangesSummary {
  proposed: number
  inEvaluation: number
  approved: number
  implemented: number
}

export interface ChangeListItem {
  id: string
  code: string
  title: string
  changeType: ChangeType
  processName: string | null
  requestDate: string
  status: ChangeStatus
}

export interface ChangeDetail {
  id: string
  code: string
  title: string
  description: string | null
  changeType: ChangeType
  processId: string | null
  processName: string | null
  requestDate: string
  requestedByName: string | null
  impactAssessment: string | null
  status: ChangeStatus
  approverName: string | null
  decisionDate: string | null
  implementationNotes: string | null
  canManage: boolean
  canApprove: boolean
  timeline: NcTimelineEvent[]
}

// ---------- Capacitación / LMS (ISO 7.2) (v1.2-4b) ----------

export type CourseStatus = "borrador" | "publicado" | "archivado"

/** Opción de una pregunta en el diseñador (la correcta solo existe en gestión). */
export interface CourseOption {
  text: string
  correct: boolean
}

export interface CourseQuestionView {
  id: string
  order: number
  text: string
  options: CourseOption[]
}

/** Pregunta tal como se entrega al tomar el curso: SIN marca de correcta. */
export interface CourseQuestionToTake {
  id: string
  order: number
  text: string
  options: string[]
}

export interface CourseListItem {
  id: string
  code: string
  title: string
  status: CourseStatus
  passingScore: number
  processName: string | null
  questionCount: number
  approvedCount: number
  canManage: boolean
}

export interface CoursesSummary {
  total: number
  published: number
  approvedThisMonth: number
}

export interface CourseEnrollmentView {
  id: string
  userName: string
  status: "aprobado" | "no_aprobado"
  score: number
  completedAt: string
}

export interface CourseDetail {
  id: string
  code: string
  title: string
  description: string | null
  content: string | null
  status: CourseStatus
  passingScore: number
  processId: string | null
  processName: string | null
  questions: CourseQuestionView[]
  enrollments: CourseEnrollmentView[]
  myEnrollment: CourseEnrollmentView | null
  canManage: boolean
  canTake: boolean
  timeline: NcTimelineEvent[]
}

/** Curso listo para tomarse (desde get_course_to_take, sin respuestas correctas). */
export interface CourseToTake {
  id: string
  code: string
  title: string
  content: string | null
  passingScore: number
  questions: CourseQuestionToTake[]
}

/** Resultado de un intento (desde submit_course_attempt). */
export interface CourseAttemptResult {
  score: number
  status: "aprobado" | "no_aprobado"
  passingScore: number
}

// ---------- Contexto de la organización (ISO 4.1/4.2) (v1.3-1) ----------

export type Swot = "fortaleza" | "debilidad" | "oportunidad" | "amenaza"
export type Pestel = "politico" | "economico" | "social" | "tecnologico" | "ecologico" | "legal"
export type PartyType = "cliente" | "proveedor" | "empleado" | "accionista" | "autoridad" | "comunidad" | "otro"
export type ContextStatus = "vigente" | "archivada"

export interface ContextIssueView {
  id: string
  swot: Swot
  pestel: Pestel | null
  description: string
  implication: string | null
  processId: string | null
  processName: string | null
  riskId: string | null
  riskCode: string | null
  objectiveId: string | null
  objectiveCode: string | null
  status: ContextStatus
  canManage: boolean
}

export interface InterestedPartyView {
  id: string
  name: string
  partyType: PartyType
  needsExpectations: string | null
  requirements: string | null
  monitoring: string | null
  processId: string | null
  processName: string | null
  legalRequirementId: string | null
  legalRequirementCode: string | null
  status: ContextStatus
  canManage: boolean
}

export interface ContextSummary {
  total: number
  internal: number
  external: number
  parties: number
}

// ---------- Caracterización de procesos (ISO 4.4) (v1.3-2) ----------

export interface ProcessMapItem {
  id: string
  code: string
  name: string
  type: ProcessType
  leaderName: string | null
  characterized: boolean
}

export interface ProcessMapSummary {
  total: number
  characterized: number
  uncharacterized: number
}

export interface ProcessCharacterization {
  objective: string | null
  scope: string | null
  inputs: string | null
  suppliers: string | null
  outputs: string | null
  clients: string | null
  resources: string | null
  phvaPlan: string | null
  phvaDo: string | null
  phvaCheck: string | null
  phvaAct: string | null
}

/** Conteos de lo ligado a un proceso (por process_id, respetando la RLS de cada módulo). */
export interface ProcessLinkedCounts {
  indicators: number
  risks: number
  documents: number
  objectives: number
  legal: number
  parties: number
  issues: number
}

export interface ProcessDetail {
  id: string
  code: string
  name: string
  type: ProcessType
  leaderName: string | null
  characterizedAt: string | null
  characterization: ProcessCharacterization
  linked: ProcessLinkedCounts
  canManage: boolean
}

// ---------- Tablero configurable (v1.3-3b) ----------

export type DashboardBlockKey =
  | "kpi_mejora" | "kpi_desempeno" | "kpi_cliente" | "kpi_documentos"
  | "panel_nc" | "panel_indicadores" | "panel_objetivos" | "panel_pqrs"

export interface DashboardBlock {
  key: DashboardBlockKey
  visible: boolean
}

// ---------- Salida no conforme (ISO 8.7) (v1.3-5a) ----------

export type NcOutputStatus = "abierto" | "tratado" | "cerrado" | "anulado"
export type Disposition =
  | "separar" | "reproceso" | "reclasificar" | "concesion" | "devolucion" | "desecho" | "suspender_servicio"

export interface NcOutputListItem {
  id: string
  code: string
  description: string
  status: NcOutputStatus
  disposition: Disposition | null
  processName: string | null
  detectedDate: string
  nonconformityCode: string | null
}

export interface NcOutputsSummary {
  open: number
  treated: number
  closed: number
}

export interface NcOutputDetail {
  id: string
  code: string
  description: string
  status: NcOutputStatus
  processId: string | null
  processName: string | null
  detectedDate: string
  identification: string | null
  disposition: Disposition | null
  dispositionDetail: string | null
  customerInformed: boolean
  responsibleName: string | null
  nonconformityId: string | null
  nonconformityCode: string | null
  canManage: boolean
  timeline: NcTimelineEvent[]
}

// ---------- API pública (claves de API) (v1.3) ----------

export type ApiScope =
  | "read:nonconformities" | "read:indicators" | "read:risks" | "read:audits" | "read:pqrs"
  | "write:nonconformities" | "write:indicators" | "write:pqrs" | "write:nonconforming_outputs"

export type WebhookEvent =
  | "nonconformity.created" | "indicator.measurement.recorded" | "pqrs.created" | "nonconforming_output.created"

export interface WebhookEndpointView {
  id: string
  url: string
  events: WebhookEvent[]
  createdAt: string
  revokedAt: string | null
  deliveries: number
  failed: number
}

/** Devuelto al crear un webhook: el secreto de firma, visible una sola vez. */
export interface WebhookCreated {
  secret: string
}

export interface ApiKeyView {
  id: string
  name: string
  keyPrefix: string
  scopes: ApiScope[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

/** Devuelto al crear una clave: el token en claro, visible una sola vez. */
export interface ApiKeyCreated {
  token: string
  keyPrefix: string
}

// ---------- Gestión del conocimiento (ISO 7.1.6) (v1.4-2) ----------

export type KnowledgeCategory = "buenas_practicas" | "lecciones_aprendidas" | "know_how" | "faq"
export type KnowledgeStatus = "vigente" | "archivado"

export interface KnowledgeListItem {
  id: string
  code: string
  title: string
  category: KnowledgeCategory
  processName: string | null
  sourceNcCode: string | null
  sourceAuditCode: string | null
  status: KnowledgeStatus
  canManage: boolean
}

export interface KnowledgeSummary {
  total: number
  byCategory: Record<KnowledgeCategory, number>
}

export interface KnowledgeDetail {
  id: string
  code: string
  title: string
  category: KnowledgeCategory
  content: string
  processId: string | null
  processName: string | null
  source: string | null
  sourceNcCode: string | null
  sourceAuditCode: string | null
  status: KnowledgeStatus
  canManage: boolean
  timeline: NcTimelineEvent[]
}

// ---------- Resultado de mutaciones ----------

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }
