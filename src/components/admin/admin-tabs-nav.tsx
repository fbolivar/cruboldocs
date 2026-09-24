"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import type * as React from "react"

import { ADMIN_TAB_LABELS } from "@/components/admin/labels"
import { TabSkeleton } from "@/components/admin/tab-skeleton"
import type { AdminTab } from "@/lib/domain/access"

interface AdminTabsNavProps {
  tabs: AdminTab[]
  active: AdminTab
  /** Contador de pendientes junto a "Recertificación" (se carga aparte). */
  recertBadge: React.ReactNode
  /** Contenido de la pestaña activa (renderizado en el servidor). */
  children: React.ReactNode
}

/**
 * Pestañas sincronizadas con `?tab=`; en móvil hacen scroll horizontal con la activa centrada.
 * Al cambiar de pestaña se marca la nueva y se muestra su skeleton mientras llega del servidor.
 */
export function AdminTabsNav({ tabs, active, recertBadge, children }: AdminTabsNavProps) {
  const router = useRouter()
  const activeRef = useRef<HTMLAnchorElement>(null)
  const [target, setTarget] = useState(active)
  const [pending, startTransition] = useTransition()
  const shown = pending ? target : active

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [shown])

  function go(e: React.MouseEvent<HTMLAnchorElement>, tab: AdminTab, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (tab === active) return
    setTarget(tab)
    startTransition(() => router.push(href, { scroll: false }))
  }

  return (
    <>
      <nav aria-label="Secciones de administración" className="-mx-4 border-b border-borde md:mx-0">
        <ul className="relative flex overflow-x-auto px-4 md:px-0">
          {tabs.map((tab) => {
            const current = tab === shown
            const href = `/app/admin?tab=${tab}`
            return (
              <li key={tab} className="shrink-0">
                <Link
                  ref={current ? activeRef : undefined}
                  href={href}
                  scroll={false}
                  onClick={(e) => go(e, tab, href)}
                  aria-current={current ? "page" : undefined}
                  data-active={current || undefined}
                  className="-mb-px flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-label whitespace-nowrap text-texto-sec transition-colors duration-150 hover:text-texto data-active:border-acento data-active:text-texto"
                >
                  {ADMIN_TAB_LABELS[tab]}
                  {tab === "recertificacion" && recertBadge}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {pending && target !== active ? <TabSkeleton /> : children}
    </>
  )
}
