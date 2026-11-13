import { canSeeAdmin, canSeeApprovals, canSeeAudits, canSeeChanges, canSeeCompetencies, canSeeContext, canSeeCourses, canSeeDashboard, canSeeEnv, canSeeFocos, canSeeForms, canSeeHazards, canSeeIndicators, canSeeInspections, canSeeKnowledge, canSeeLegal, canSeeMetrology, canSeeMinutes, canSeeNcOutputs, canSeeNonconformities, canSeeObjectives, canSeePqrs, canSeeProcessMap, canSeeReports, canSeeReviews, canSeeRisks, canSeeSst, canSeeSuppliers } from "@/lib/domain/access"
import type { CurrentUser } from "@/lib/types"

export type NavIcon = "inicio" | "tablero" | "focos" | "documentos" | "contexto" | "procesos" | "riesgos" | "noconf" | "salidas" | "auditorias" | "indicadores" | "revisiones" | "competencias" | "proveedores" | "pqrs" | "inspecciones" | "actas" | "objetivos" | "legal" | "peligros" | "ambiental" | "sgsst" | "metrologia" | "cambios" | "formularios" | "capacitacion" | "conocimiento" | "solicitudes" | "informes" | "admin"

export interface NavItem {
  href: string
  label: string
  icon: NavIcon
  /** Separador antes del ítem (Administración). */
  separated?: boolean
}

/** Ítems visibles según rol: se ocultan, no se deshabilitan (spec-shell §6). Las etiquetas vienen
 * del diccionario del idioma del usuario (v1.4-4), indexadas por el ícono. */
export function navItemsFor(user: CurrentUser, nav: Record<NavIcon, string>): NavItem[] {
  const item = (href: string, icon: NavIcon, separated?: boolean): NavItem => ({ href, label: nav[icon], icon, separated })
  const items: NavItem[] = [item("/app", "inicio")]
  if (canSeeDashboard(user)) items.push(item("/app/tablero", "tablero"))
  if (canSeeFocos(user)) items.push(item("/app/focos", "focos"))
  items.push(item("/app/documentos", "documentos"))
  if (canSeeContext(user)) items.push(item("/app/contexto", "contexto"))
  if (canSeeProcessMap(user)) items.push(item("/app/procesos", "procesos"))
  if (canSeeRisks(user)) items.push(item("/app/riesgos", "riesgos"))
  if (canSeeNonconformities(user)) items.push(item("/app/no-conformidades", "noconf"))
  if (canSeeNcOutputs(user)) items.push(item("/app/salidas-no-conformes", "salidas"))
  if (canSeeAudits(user)) items.push(item("/app/auditorias", "auditorias"))
  if (canSeeIndicators(user)) items.push(item("/app/indicadores", "indicadores"))
  if (canSeeReviews(user)) items.push(item("/app/revisiones", "revisiones"))
  if (canSeeCompetencies(user)) items.push(item("/app/competencias", "competencias"))
  if (canSeeSuppliers(user)) items.push(item("/app/proveedores", "proveedores"))
  if (canSeePqrs(user)) items.push(item("/app/pqrs", "pqrs"))
  if (canSeeInspections(user)) items.push(item("/app/inspecciones", "inspecciones"))
  if (canSeeMinutes(user)) items.push(item("/app/actas", "actas"))
  if (canSeeObjectives(user)) items.push(item("/app/objetivos", "objetivos"))
  if (canSeeLegal(user)) items.push(item("/app/requisitos-legales", "legal"))
  if (canSeeHazards(user)) items.push(item("/app/peligros", "peligros"))
  if (canSeeSst(user)) items.push(item("/app/sg-sst", "sgsst"))
  if (canSeeEnv(user)) items.push(item("/app/aspectos-ambientales", "ambiental"))
  if (canSeeMetrology(user)) items.push(item("/app/metrologia", "metrologia"))
  if (canSeeChanges(user)) items.push(item("/app/cambios", "cambios"))
  if (canSeeForms(user)) items.push(item("/app/formularios", "formularios"))
  if (canSeeCourses(user)) items.push(item("/app/capacitacion", "capacitacion"))
  if (canSeeKnowledge(user)) items.push(item("/app/conocimiento", "conocimiento"))
  if (canSeeApprovals(user)) items.push(item("/app/solicitudes", "solicitudes"))
  if (canSeeReports(user)) items.push(item("/app/informes", "informes"))
  if (canSeeAdmin(user)) items.push(item("/app/admin", "admin", true))
  return items
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}
