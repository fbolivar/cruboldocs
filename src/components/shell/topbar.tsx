"use client"

import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useBreadcrumbLabel } from "@/components/shell/breadcrumb-context"
import { GlobalSearch, MobileSearch } from "@/components/shell/global-search"
import { isActive, type NavItem } from "@/components/shell/nav-items"
import { UserMenu } from "@/components/shell/user-menu"
import { LogoHex } from "@/components/ui/logo-hex"
import type { CurrentUser } from "@/lib/types"

interface TopbarProps {
  user: CurrentUser
  items: NavItem[]
}

/** Breadcrumb desde la estructura de rutas; la página de detalle aporta el último nivel. */
function useTrail(items: NavItem[]) {
  const pathname = usePathname()
  const detail = useBreadcrumbLabel()
  const section = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => isActive(pathname, i.href))
  const isDetail = section ? pathname !== section.href && pathname.startsWith(`${section.href}/`) : false
  return { section, detail: isDetail ? detail : null }
}

export function Topbar({ user, items }: TopbarProps) {
  const { section, detail } = useTrail(items)
  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-borde bg-superficie px-8 md:flex print:!hidden">
      <nav aria-label="Ruta de navegación" className="text-small text-texto-sec">
        <ol className="flex items-center gap-1.5">
          {detail && section ? (
            <>
              <li>
                <Link href={section.href} className="hover:text-texto hover:underline">
                  {section.label}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-texto">
                {detail}
              </li>
            </>
          ) : (
            <li aria-current="page" className="font-medium text-texto">
              {section?.label}
            </li>
          )}
        </ol>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {user.organizations.length > 1 && (
          <span className="text-small text-texto-sec" title="Organización activa">
            {user.organization.name}
          </span>
        )}
        <GlobalSearch />
        <UserMenu user={user} />
      </div>
    </header>
  )
}

/** Móvil: logo + título (o "‹ Volver" en detalle) + búsqueda + avatar. */
export function MobileTopbar({ user, items }: TopbarProps) {
  const { section, detail } = useTrail(items)
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-borde bg-superficie px-4 md:hidden print:!hidden">
      {detail && section ? (
        <Link href={section.href} className="-ml-2 flex h-11 flex-1 items-center gap-1 font-display font-semibold">
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
          {section.label}
        </Link>
      ) : (
        <div className="flex flex-1 items-center gap-2.5">
          <LogoHex className="size-7" />
          <span className="font-display text-h3 font-semibold">{section?.label ?? "CrubolDocs"}</span>
        </div>
      )}
      <MobileSearch />
      <UserMenu user={user} />
    </header>
  )
}
