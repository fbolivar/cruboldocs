import { canSeeAdmin, canSeeAudits, canSeeChanges, canSeeCompetencies, canSeeContext, canSeeCourses, canSeeDashboard, canSeeEnv, canSeeForms, canSeeHazards, canSeeIndicators, canSeeLegal, canSeeMetrology, canSeeMinutes, canSeeNonconformities, canSeeObjectives, canSeePqrs, canSeeProcessMap, canSeeReviews, canSeeRisks, canSeeSst, canSeeSuppliers } from "@/lib/domain/access"
import type { CurrentUser } from "@/lib/types"

export type NavIcon = "inicio" | "tablero" | "documentos" | "contexto" | "procesos" | "riesgos" | "noconf" | "auditorias" | "indicadores" | "revisiones" | "competencias" | "proveedores" | "pqrs" | "actas" | "objetivos" | "legal" | "peligros" | "ambiental" | "sgsst" | "metrologia" | "cambios" | "formularios" | "capacitacion" | "admin"

export interface NavItem {
  href: string
  label: string
  icon: NavIcon
  /** Separador antes del ítem (Administración). */
  separated?: boolean
}

/** Ítems visibles según rol: se ocultan, no se deshabilitan (spec-shell §6). */
export function navItemsFor(user: CurrentUser): NavItem[] {
  const items: NavItem[] = [
    { href: "/app", label: "Inicio", icon: "inicio" },
  ]
  if (canSeeDashboard(user)) items.push({ href: "/app/tablero", label: "Tablero", icon: "tablero" })
  items.push({ href: "/app/documentos", label: "Documentos", icon: "documentos" })
  if (canSeeContext(user)) items.push({ href: "/app/contexto", label: "Contexto", icon: "contexto" })
  if (canSeeProcessMap(user)) items.push({ href: "/app/procesos", label: "Procesos", icon: "procesos" })
  if (canSeeRisks(user)) items.push({ href: "/app/riesgos", label: "Riesgos", icon: "riesgos" })
  if (canSeeNonconformities(user)) items.push({ href: "/app/no-conformidades", label: "No conformidades", icon: "noconf" })
  if (canSeeAudits(user)) items.push({ href: "/app/auditorias", label: "Auditorías", icon: "auditorias" })
  if (canSeeIndicators(user)) items.push({ href: "/app/indicadores", label: "Indicadores", icon: "indicadores" })
  if (canSeeReviews(user)) items.push({ href: "/app/revisiones", label: "Revisión por la dirección", icon: "revisiones" })
  if (canSeeCompetencies(user)) items.push({ href: "/app/competencias", label: "Competencias", icon: "competencias" })
  if (canSeeSuppliers(user)) items.push({ href: "/app/proveedores", label: "Proveedores", icon: "proveedores" })
  if (canSeePqrs(user)) items.push({ href: "/app/pqrs", label: "PQRS", icon: "pqrs" })
  if (canSeeMinutes(user)) items.push({ href: "/app/actas", label: "Actas", icon: "actas" })
  if (canSeeObjectives(user)) items.push({ href: "/app/objetivos", label: "Objetivos", icon: "objetivos" })
  if (canSeeLegal(user)) items.push({ href: "/app/requisitos-legales", label: "Requisitos legales", icon: "legal" })
  if (canSeeHazards(user)) items.push({ href: "/app/peligros", label: "Peligros SST", icon: "peligros" })
  if (canSeeSst(user)) items.push({ href: "/app/sg-sst", label: "SG-SST (0312)", icon: "sgsst" })
  if (canSeeEnv(user)) items.push({ href: "/app/aspectos-ambientales", label: "Aspectos ambientales", icon: "ambiental" })
  if (canSeeMetrology(user)) items.push({ href: "/app/metrologia", label: "Metrología", icon: "metrologia" })
  if (canSeeChanges(user)) items.push({ href: "/app/cambios", label: "Gestión del cambio", icon: "cambios" })
  if (canSeeForms(user)) items.push({ href: "/app/formularios", label: "Formularios", icon: "formularios" })
  if (canSeeCourses(user)) items.push({ href: "/app/capacitacion", label: "Capacitación", icon: "capacitacion" })
  if (canSeeAdmin(user)) items.push({ href: "/app/admin", label: "Administración", icon: "admin", separated: true })
  return items
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}
