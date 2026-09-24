import { canSeeAdmin, canSeeRisks } from "@/lib/domain/access"
import type { CurrentUser } from "@/lib/types"

export type NavIcon = "inicio" | "documentos" | "riesgos" | "admin"

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
  if (canSeeAdmin(user)) items.push({ href: "/app/admin", label: "Administración", icon: "admin", separated: true })
  return items
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}
