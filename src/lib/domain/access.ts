import { hasRole } from "@/lib/domain/documents"
import type { CurrentUser, Role } from "@/lib/types"

const RISK_ROLES: Role[] = ["lider_sig", "lider_proceso", "responsable_control", "auditor", "consulta"]

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
  | "organizaciones"

/** Pestañas visibles de /app/admin según rol (spec-admin). */
export function adminTabsFor(user: CurrentUser): AdminTab[] {
  // El Superadmin solo administra organizaciones; el resto, solo si además es miembro con ese rol.
  const platform: AdminTab[] = user.isPlatformAdmin ? ["organizaciones"] : []
  if (user.isOrgAdmin || hasRole(user, "lider_sig")) {
    return [...platform, "usuarios", "cargos", "procesos", "tipos", "normas", "recertificacion", "auditoria"]
  }
  if (hasRole(user, "auditor")) return [...platform, "auditoria"]
  return platform
}
