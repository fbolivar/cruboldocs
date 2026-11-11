import { hasRole } from "@/lib/domain/documents"
import type { CurrentUser, Role } from "@/lib/types"

const RISK_ROLES: Role[] = ["lider_sig", "lider_proceso", "responsable_control", "auditor", "consulta"]

/** Puede traducir el contenido de un documento (v1.4-4): elaborador, Líder SIG o Líder del proceso. */
export function canTranslateDocument(user: CurrentUser, processId?: string | null): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId ?? undefined) || hasRole(user, "elaborador", processId ?? undefined)
}

/** Pantalla Riesgos: líderes, responsable de control, auditor y consulta (spec-shell). */
export function canSeeRisks(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Pantalla No Conformidades: mismos roles del SIG que riesgos (el reporte es abierto a todos). */
export function canSeeNonconformities(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Puede gestionar no conformidades (causa, acciones, verificación): Líder SIG o Líder de proceso. */
export function canManageNonconformities(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Auditorías: mismos roles del SIG que riesgos/no conformidades. */
export function canSeeAudits(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Planifica, inicia, cierra o cancela auditorías: Líder SIG. */
export function canManageAudits(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig")
}

/** Registra hallazgos (solo en ejecución): rol auditor o Líder SIG. */
export function canAddFindings(user: CurrentUser): boolean {
  return hasRole(user, "auditor") || hasRole(user, "lider_sig")
}

/** Pantalla Indicadores (KPIs): mismos roles del SIG que riesgos/no conformidades/auditorías. */
export function canSeeIndicators(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea, edita o archiva la ficha de un indicador: Líder SIG. */
export function canManageIndicators(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig")
}

/** Registra mediciones / genera NC: Líder SIG o Líder del proceso dueño. */
export function canMeasureIndicator(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Revisión por la dirección: mismos roles del SIG que los demás módulos. */
export function canSeeReviews(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/cierra (firma)/cancela el acta: Líder SIG (representante de la dirección). */
export function canManageReviews(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig")
}

/** Pantalla Competencias: mismos roles del SIG que los demás módulos. */
export function canSeeCompetencies(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Gestiona catálogo, perfiles, formación y evaluaciones: Líder SIG o Líder del proceso del cargo. */
export function canManageCompetencies(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Proveedores: mismos roles del SIG que los demás módulos. */
export function canSeeSuppliers(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Registra/edita/evalúa/da de baja proveedores: Líder SIG o Líder del proceso del proveedor. */
export function canManageSuppliers(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla PQRS: mismos roles del SIG que los demás módulos. */
export function canSeePqrs(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Registra/gestiona/responde/cierra PQRS y registra satisfacción: Líder SIG o Líder del proceso del caso. */
export function canManagePqrs(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Aspectos ambientales (14001): mismos roles del SIG que los demás módulos. */
export function canSeeEnv(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/valora aspectos ambientales: Líder SIG o Líder del proceso. */
export function canManageEnv(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Peligros SST (matriz GTC-45): mismos roles del SIG que los demás módulos. */
export function canSeeHazards(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/valora peligros: Líder SIG o Líder del proceso. */
export function canManageHazards(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Administra el catálogo de normas: Admin de organización o Líder SIG. */
export function canManageNorms(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig")
}

/** Puede etiquetar registros por norma: Líder SIG o Líder de proceso. */
export function canTagNorms(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso")
}

/** Pantalla Requisitos legales: mismos roles del SIG que los demás módulos. */
export function canSeeLegal(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/evalúa/deroga requisitos: Líder SIG o Líder del proceso del requisito. */
export function canManageLegal(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Tablero gerencial: Líder SIG, auditor y la dirección (gerente/aprobador). Otros roles del SIG
 *  lo ven acotado por su RLS; la dirección entra aquí aunque no gestione el SGC. */
export function canSeeDashboard(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "auditor") || hasRole(user, "aprobador")
    || hasRole(user, "lider_proceso") || hasRole(user, "responsable_control") || hasRole(user, "consulta")
}

/** Pantalla Actas de reunión: mismos roles del SIG que los demás módulos. */
export function canSeeMinutes(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/cierra actas y agrega/cumple compromisos: Líder SIG o Líder del proceso del acta. */
export function canManageMinutes(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Objetivos de calidad (BSC): mismos roles del SIG que los demás módulos. */
export function canSeeObjectives(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/liga indicadores/cambia estado de objetivos: Líder SIG o Líder del proceso dueño. */
export function canManageObjectives(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Formularios: mismos roles del SIG que los demás módulos. */
export function canSeeForms(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/publica/versiona/archiva plantillas: Líder SIG o Líder del proceso dueño. */
export function canManageForms(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Diligencia un formulario publicado: cualquier miembro activo de la organización
 *  (un CurrentUser con sesión siempre lo es en su organización activa). */
export function canFillForms(user: CurrentUser): boolean {
  return Boolean(user.organization)
}

/** Pantalla SG-SST (Estándares Mínimos, Res. 0312): mismos roles del SIG que los demás módulos. */
export function canSeeSst(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/diligencia/cierra autoevaluaciones y gestiona el plan de mejora: Líder SIG o Líder de proceso. */
export function canManageSst(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso")
}

/** Pantalla Metrología (equipos 7.1.5): mismos roles del SIG que los demás módulos. */
export function canSeeMetrology(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Registra equipos y calibraciones: Líder SIG o Líder del proceso del equipo. */
export function canManageMetrology(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Gestión del cambio (6.3): mismos roles del SIG que los demás módulos. */
export function canSeeChanges(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/evalúa/implementa solicitudes de cambio: Líder SIG o Líder del proceso. */
export function canManageChanges(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Aprueba o rechaza un cambio: solo Líder SIG. */
export function canApproveChange(user: CurrentUser): boolean {
  return hasRole(user, "lider_sig")
}

/** Base de conocimiento (ISO 7.1.6): visible para cualquier miembro activo de la organización. */
export function canSeeKnowledge(user: CurrentUser): boolean {
  return Boolean(user.organization)
}

/** Crea/edita/archiva artículos y registra lecciones: Líder SIG o Líder del proceso. */
export function canManageKnowledge(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Salidas no conformes (ISO 8.7): mismos roles del SIG que los demás módulos. */
export function canSeeNcOutputs(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Registra/gestiona/cierra salidas no conformes y genera NC: Líder SIG o Líder del proceso. */
export function canManageNcOutputs(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Procesos (mapa + caracterización, ISO 4.4): mismos roles del SIG que los demás módulos. */
export function canSeeProcessMap(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Caracteriza un proceso: Líder SIG o Líder del proceso. El catálogo (alta/baja) sigue en Admin. */
export function canManageProcess(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Contexto de la organización (ISO 4.1/4.2): mismos roles del SIG que los demás módulos. */
export function canSeeContext(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/archiva cuestiones y partes interesadas y genera riesgos: Líder SIG o Líder del proceso. */
export function canManageContext(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Pantalla Capacitación (LMS, ISO 7.2): mismos roles del SIG que los demás módulos. */
export function canSeeCourses(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
}

/** Crea/edita/publica/archiva cursos y sus preguntas: Líder SIG o Líder del proceso dueño. */
export function canManageCourses(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** Toma un curso publicado: cualquier miembro activo de la organización. */
export function canTakeCourses(user: CurrentUser): boolean {
  return Boolean(user.organization)
}

/** Puede identificar riesgos y agregar controles o valoraciones. */
export function canManageRisks(user: CurrentUser, processId?: string): boolean {
  return hasRole(user, "lider_sig") || hasRole(user, "lider_proceso", processId)
}

/** IP de los firmantes: dato personal, solo para quien administra o audita (AUD RA-12). */
export function canSeeSignatureIp(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig") || hasRole(user, "auditor")
}

export function canSeeAdmin(user: CurrentUser): boolean {
  return user.isOrgAdmin || user.isPlatformAdmin || hasRole(user, "lider_sig") || hasRole(user, "auditor")
}

/** Administra el catálogo (procesos, tipos, cargos): Admin de organización o Líder SIG.
 * Igual que `can_manage_org` en la base, que es quien puede usar Crubol-Agent. */
export function canManageCatalog(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig")
}

export type AdminTab =
  | "usuarios"
  | "cargos"
  | "procesos"
  | "tipos"
  | "normas"
  | "recertificacion"
  | "auditoria"
  | "api"
  | "flujos"
  | "organizaciones"

/** Administra las claves de API: Admin de organización o Líder SIG (igual que can_manage_org). */
export function canManageApiKeys(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig")
}

/** Solicitudes (BPM-lite): cualquier miembro activo ve y radica; el stepper filtra la acción por cargo. */
export function canSeeApprovals(user: CurrentUser): boolean {
  return !!user.organization.id
}

/** Gestiona plantillas de flujo (BPM-lite): Admin de organización o Líder SIG (igual que can_manage_flows). */
export function canManageFlows(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig")
}

/** Informes (BI, v1.4-6): cualquier miembro activo ve/crea; compartir es del Líder SIG. */
export function canSeeReports(user: CurrentUser): boolean {
  return !!user.organization.id
}

/** Comparte/gestiona informes compartidos: Admin de organización o Líder SIG (igual que can_manage_reports). */
export function canManageReports(user: CurrentUser): boolean {
  return user.isOrgAdmin || hasRole(user, "lider_sig")
}

/** Pestañas visibles de /app/admin según rol (spec-admin). */
export function adminTabsFor(user: CurrentUser): AdminTab[] {
  // El Superadmin solo administra organizaciones; el resto, solo si además es miembro con ese rol.
  const platform: AdminTab[] = user.isPlatformAdmin ? ["organizaciones"] : []
  if (user.isOrgAdmin || hasRole(user, "lider_sig")) {
    return [...platform, "usuarios", "cargos", "procesos", "tipos", "normas", "recertificacion", "auditoria", "api", "flujos"]
  }
  if (hasRole(user, "auditor")) return [...platform, "auditoria"]
  return platform
}
