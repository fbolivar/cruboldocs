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
  | "recertificacion"
  | "auditoria"
  | "organizaciones"

/** Pestañas visibles de /app/admin según rol (spec-admin). */
export function adminTabsFor(user: CurrentUser): AdminTab[] {
  // El Superadmin solo administra organizaciones; el resto, solo si además es miembro con ese rol.
  const platform: AdminTab[] = user.isPlatformAdmin ? ["organizaciones"] : []
  if (user.isOrgAdmin || hasRole(user, "lider_sig")) {
    return [...platform, "usuarios", "cargos", "procesos", "tipos", "recertificacion", "auditoria"]
  }
  if (hasRole(user, "auditor")) return [...platform, "auditoria"]
  return platform
}
