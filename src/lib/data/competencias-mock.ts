// DATOS DE EJEMPLO del módulo Competencias (fase frontend). Misma forma que tendrán las queries reales;
// la fase de backend reemplaza este archivo por queries.ts + actions.ts. NO usar en producción.

import { coveragePct, deriveStatus } from "@/components/competencias/labels"
import type {
  CompetencyListItem,
  CompetencyMatrix,
  CompetencySummary,
  PersonCompetencyDetail,
  PositionProfileDetail,
  TrainingListItem,
} from "@/lib/types"

const CATALOG: CompetencyListItem[] = [
  { id: "c1", name: "Auditoría interna ISO 19011", description: "Planear y conducir auditorías internas.", kind: "formacion", isActive: true, positionCount: 2 },
  { id: "c2", name: "Redacción técnica", description: "Elaborar procedimientos y documentos del SGC.", kind: "habilidad", isActive: true, positionCount: 2 },
  { id: "c3", name: "ISO 9001:2015", description: "Requisitos de la norma.", kind: "educacion", isActive: true, positionCount: 3 },
  { id: "c4", name: "Hoja de cálculo (Excel)", description: "Indicadores y tablas dinámicas.", kind: "habilidad", isActive: true, positionCount: 1 },
  { id: "c5", name: "Experiencia en calidad (2+ años)", description: null, kind: "experiencia", isActive: false, positionCount: 0 },
]

const matrix: CompetencyMatrix = {
  columns: [
    { competencyId: "c1", competencyName: "Auditoría interna ISO 19011", kind: "formacion" },
    { competencyId: "c2", competencyName: "Redacción técnica", kind: "habilidad" },
    { competencyId: "c3", competencyName: "ISO 9001:2015", kind: "educacion" },
    { competencyId: "c4", competencyName: "Hoja de cálculo (Excel)", kind: "habilidad" },
  ],
  rows: [
    {
      membershipId: "m1", personName: "Ana Ruiz", positionName: "Líder SIG", processName: "Gestión de Calidad (SGC)",
      cells: [
        { competencyId: "c1", requiredLevel: 3, assessedLevel: 3, status: deriveStatus(3, 3, false) },
        { competencyId: "c2", requiredLevel: 2, assessedLevel: 2, status: deriveStatus(2, 2, false) },
        { competencyId: "c3", requiredLevel: 3, assessedLevel: 2, status: deriveStatus(2, 3, true) },
        { competencyId: "c4", requiredLevel: 1, assessedLevel: null, status: deriveStatus(null, 1, false) },
      ],
    },
    {
      membershipId: "m2", personName: "Beto Páez", positionName: "Auditor interno", processName: "Gestión de Calidad (SGC)",
      cells: [
        { competencyId: "c1", requiredLevel: 2, assessedLevel: 2, status: deriveStatus(2, 2, false) },
        { competencyId: "c2", requiredLevel: 1, assessedLevel: 1, status: deriveStatus(1, 1, false) },
        { competencyId: "c3", requiredLevel: 2, assessedLevel: 1, status: deriveStatus(1, 2, false) },
      ],
    },
    {
      membershipId: "m3", personName: "Carla Mesa", positionName: "Analista de procesos", processName: "Dirección Estratégica",
      cells: [
        { competencyId: "c3", requiredLevel: 2, assessedLevel: 2, status: deriveStatus(2, 2, false) },
        { competencyId: "c4", requiredLevel: 1, assessedLevel: 1, status: deriveStatus(1, 1, false) },
      ],
    },
  ],
}

const TRAININGS: TrainingListItem[] = [
  { id: "t1", title: "Diplomado Auditor Interno ISO 19011", kind: "externa", provider: "Icontec", trainingDate: "2025-03-15", hours: 40, attendeeCount: 2 },
  { id: "t2", title: "Taller interno de redacción de procedimientos", kind: "interna", provider: null, trainingDate: "2026-02-10", hours: 4, attendeeCount: 3 },
  { id: "t3", title: "Curso ISO 9001:2015", kind: "externa", provider: "SGS", trainingDate: "2024-11-02", hours: 16, attendeeCount: 3 },
]

const PROFILES: Record<string, PositionProfileDetail> = {
  p1: {
    positionId: "p1", positionName: "Líder SIG", processName: "Gestión de Calidad (SGC)",
    requirements: [
      { id: "r1", competencyId: "c1", competencyName: "Auditoría interna ISO 19011", kind: "formacion", requiredLevel: 3, isMandatory: true, note: null },
      { id: "r2", competencyId: "c2", competencyName: "Redacción técnica", kind: "habilidad", requiredLevel: 2, isMandatory: true, note: null },
      { id: "r3", competencyId: "c3", competencyName: "ISO 9001:2015", kind: "educacion", requiredLevel: 3, isMandatory: true, note: null },
      { id: "r4", competencyId: "c4", competencyName: "Hoja de cálculo (Excel)", kind: "habilidad", requiredLevel: 1, isMandatory: false, note: "Deseable." },
    ],
  },
}

const PEOPLE: Record<string, PersonCompetencyDetail> = {
  m1: {
    membershipId: "m1", personName: "Ana Ruiz", positionName: "Líder SIG", processName: "Gestión de Calidad (SGC)",
    canManage: true, isSelf: false,
    competencies: [
      { competencyId: "c1", competencyName: "Auditoría interna ISO 19011", kind: "formacion", requiredLevel: 3, assessedLevel: 3, status: "cumple", nextReviewDate: "2027-06-01", gapTaskId: null },
      { competencyId: "c2", competencyName: "Redacción técnica", kind: "habilidad", requiredLevel: 2, assessedLevel: 2, status: "cumple", nextReviewDate: null, gapTaskId: null },
      { competencyId: "c3", competencyName: "ISO 9001:2015", kind: "educacion", requiredLevel: 3, assessedLevel: 2, status: "brecha_en_plan", nextReviewDate: "2026-12-01", gapTaskId: "task-1" },
      { competencyId: "c4", competencyName: "Hoja de cálculo (Excel)", kind: "habilidad", requiredLevel: 1, assessedLevel: null, status: "sin_evaluar", nextReviewDate: null, gapTaskId: null },
    ],
    trainings: [
      { id: "ta1", trainingId: "t1", title: "Diplomado Auditor Interno ISO 19011", kind: "externa", provider: "Icontec", trainingDate: "2025-03-15", hours: 40, result: "aprobado", hasCertificate: true, certificateName: "diploma-auditor.pdf", validUntil: "2027-03-01" },
      { id: "ta2", trainingId: "t2", title: "Taller interno de redacción de procedimientos", kind: "interna", provider: null, trainingDate: "2026-02-10", hours: 4, result: "asistio", hasCertificate: false, certificateName: null, validUntil: null },
    ],
    timeline: [
      { at: "2026-02-10T15:00:00Z", actor: "Ana Ruiz", text: "Evaluó «ISO 9001:2015»: brecha en plan (2/3)." },
      { at: "2025-03-20T10:00:00Z", actor: "Ana Ruiz", text: "Registró formación «Diplomado Auditor Interno ISO 19011»." },
    ],
  },
  m2: {
    membershipId: "m2", personName: "Beto Páez", positionName: "Auditor interno", processName: "Gestión de Calidad (SGC)",
    canManage: true, isSelf: false,
    competencies: [
      { competencyId: "c1", competencyName: "Auditoría interna ISO 19011", kind: "formacion", requiredLevel: 2, assessedLevel: 2, status: "cumple", nextReviewDate: null, gapTaskId: null },
      { competencyId: "c2", competencyName: "Redacción técnica", kind: "habilidad", requiredLevel: 1, assessedLevel: 1, status: "cumple", nextReviewDate: null, gapTaskId: null },
      { competencyId: "c3", competencyName: "ISO 9001:2015", kind: "educacion", requiredLevel: 2, assessedLevel: 1, status: "brecha", nextReviewDate: null, gapTaskId: null },
    ],
    trainings: [
      { id: "ta3", trainingId: "t3", title: "Curso ISO 9001:2015", kind: "externa", provider: "SGS", trainingDate: "2024-11-02", hours: 16, result: "aprobado", hasCertificate: true, certificateName: "cert-iso9001.pdf", validUntil: "2026-11-02" },
    ],
    timeline: [
      { at: "2026-01-15T12:00:00Z", actor: "Ana Ruiz", text: "Evaluó «ISO 9001:2015»: brecha (1/2)." },
    ],
  },
}

// --- API de ejemplo (misma firma que tendrán las queries reales) ---

export async function getCompetencySummary(): Promise<CompetencySummary> {
  const openGaps = matrix.rows.reduce((n, r) => n + r.cells.filter((c) => c.status === "brecha" || c.status === "brecha_en_plan").length, 0)
  return { coveragePct: coveragePct(matrix.rows), openGaps, certificatesDueSoon: 1 }
}

export async function getCompetencyMatrix(): Promise<CompetencyMatrix> {
  return matrix
}

export async function listCompetencyCatalog(): Promise<CompetencyListItem[]> {
  return CATALOG
}

export async function listTrainings(): Promise<TrainingListItem[]> {
  return TRAININGS
}

export async function getPositionProfile(positionId: string): Promise<PositionProfileDetail | null> {
  return PROFILES[positionId] ?? null
}

export async function getPersonCompetencies(membershipId: string): Promise<PersonCompetencyDetail | null> {
  return PEOPLE[membershipId] ?? null
}
