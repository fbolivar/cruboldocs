"use client"

import { MenuIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { NavIcon } from "@/components/shell/nav-icon"
import { isActive, type NavItem } from "@/components/shell/nav-items"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const tab = "relative flex flex-col items-center justify-center gap-0.5 text-caption font-medium tracking-normal"

/** Barra inferior fija en móvil: Inicio, Documentos, Riesgos y "Más" (Administración y cuenta). */
export function MobileTabBar({ items, taskCount }: { items: NavItem[]; taskCount: number | null }) {
  const pathname = usePathname()
  const [more, setMore] = useState(false)
  const primary = items.filter((i) => i.icon !== "admin")
  const secondary = items.filter((i) => i.icon === "admin")
  const moreActive = secondary.some((i) => isActive(pathname, i.href))

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${primary.length + (secondary.length ? 1 : 0)}, minmax(0, 1fr))` }}
    >
      {primary.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(tab, "h-14", active ? "text-acento" : "text-texto-sec")}
          >
            <NavIcon name={item.icon} className="size-5" />
            {item.label}
            {item.icon === "inicio" && !!taskCount && (
              <span className="absolute top-1.5 left-1/2 ml-1.5 rounded-full bg-acento px-1.5 text-caption tracking-normal text-superficie">
                {taskCount}
                <span className="sr-only"> tareas pendientes</span>
              </span>
            )}
          </Link>
        )
      })}
      {secondary.length > 0 && (
        <>
          <button type="button" onClick={() => setMore(true)} className={cn(tab, "h-14", moreActive ? "text-acento" : "text-texto-sec")}>
            <MenuIcon className="size-5" aria-hidden="true" />
            Más
          </button>
          <Sheet open={more} onOpenChange={setMore}>
            <SheetContent side="bottom" className="rounded-t-lg pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>Más opciones</SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col px-2 pb-4">
                {secondary.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMore(false)}
                      className="flex h-12 items-center gap-3 rounded-sm px-3 font-medium hover:bg-superficie-alt"
                    >
                      <NavIcon name={item.icon} className="size-5" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </>
      )}
    </nav>
  )
}
