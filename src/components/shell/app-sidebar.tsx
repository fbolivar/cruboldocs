"use client"

import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { NavIcon } from "@/components/shell/nav-icon"
import { isActive, type NavItem } from "@/components/shell/nav-items"
import { LogoHex, Wordmark } from "@/components/ui/logo-hex"
import { cn } from "@/lib/utils"

export const SIDEBAR_COOKIE = "sidebar_colapsado"

interface AppSidebarProps {
  items: NavItem[]
  organizationName: string
  taskCount: number | null
  initialCollapsed: boolean
}

/** Sidebar de escritorio (≥ md): 240px, colapsable a 64px; estado en cookie. */
export function AppSidebar({ items, organizationName, taskCount, initialCollapsed }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`
  }

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-borde bg-superficie px-3 py-4 transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-1", collapsed && "justify-center px-0")}>
        <LogoHex />
        {!collapsed && (
          <div className="min-w-0">
            <Wordmark className="block" />
            <p className="truncate text-small text-texto-sec">{organizationName}</p>
          </div>
        )}
      </div>

      <nav className="mt-6 flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          const showCount = item.icon === "inicio" && !!taskCount
          return (
            <div key={item.href}>
              {item.separated && <hr className="mx-1 my-2 border-borde" />}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-2.5 rounded-sm px-3 font-medium transition-colors duration-150",
                  collapsed && "justify-center px-0",
                  active ? "bg-acento-suave text-acento" : "text-texto hover:bg-superficie-alt"
                )}
              >
                {active && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 -left-3 w-0.75 rounded-r-sm bg-acento" />}
                <NavIcon name={item.icon} className="size-5" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {showCount && (
                  <span
                    className={cn(
                      "rounded-full bg-acento px-1.5 text-caption font-semibold tracking-normal text-superficie",
                      collapsed && "absolute top-1 right-1"
                    )}
                  >
                    {taskCount}
                    <span className="sr-only"> tareas pendientes</span>
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className={cn("mt-auto flex h-10 items-center gap-2 rounded-sm px-3 text-small text-texto-sec hover:bg-superficie-alt", collapsed && "justify-center px-0")}
      >
        {collapsed ? <ChevronsRightIcon className="size-4" aria-hidden="true" /> : <ChevronsLeftIcon className="size-4" aria-hidden="true" />}
        {collapsed ? <span className="sr-only">Expandir menú</span> : "Colapsar"}
      </button>
    </aside>
  )
}
