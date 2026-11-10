import { canSeeAdmin, canSeeAudits, canSeeCompetencies, canSeeIndicators, canSeeNonconformities, canSeePqrs, canSeeReviews, canSeeRisks, canSeeSuppliers } from "@/lib/domain/access"
import type { CurrentUser } from "@/lib/types"

export type NavIcon = "inicio" | "documentos" | "riesgos" | "noconf" | "auditorias" | "indicadores" | "revisiones" | "competencias" | "proveedores" | "pqrs" | "admin"

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
    { href: "/app/documentos", label: "Documentos", icon: "documentos" },
  ]
  if (canSeeRisks(user)) items.push({ href: "/app/riesgos", label: "Riesgos", icon: "riesgos" })
  if (canSeeNonconformities(user)) items.push({ href: "/app/no-conformidades", label: "No conformidades", icon: "noconf" })
  if (canSeeAudits(user)) items.push({ href: "/app/auditorias", label: "Auditorías", icon: "auditorias" })
  if (canSeeIndicators(user)) items.push({ href: "/app/indicadores", label: "Indicadores", icon: "indicadores" })
  if (canSeeReviews(user)) items.push({ href: "/app/revisiones", label: "Revisión por la dirección", icon: "revisiones" })
  if (canSeeCompetencies(user)) items.push({ href: "/app/competencias", label: "Competencias", icon: "competencias" })
  if (canSeeSuppliers(user)) items.push({ href: "/app/proveedores", label: "Proveedores", icon: "proveedores" })
  if (canSeePqrs(user)) items.push({ href: "/app/pqrs", label: "PQRS", icon: "pqrs" })
  if (canSeeAdmin(user)) items.push({ href: "/app/admin", label: "Administración", icon: "admin", separated: true })
  return items
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}
