import { hasRole } from "@/lib/domain/documents"
import type { CurrentUser, Role } from "@/lib/types"

const RISK_ROLES: Role[] = ["lider_sig", "lider_proceso", "responsable_control", "auditor", "consulta"]

/** Pantalla Riesgos: líderes, responsable de control, auditor y consulta (spec-shell). */
export function canSeeRisks(user: CurrentUser): boolean {
  return RISK_ROLES.some((r) => hasRole(user, r))
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
