"use client"

import { ChevronDownIcon } from "lucide-react"
import type * as React from "react"
import { useId, useState, useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

const DESKTOP = "(min-width: 48rem)"

function subscribe(callback: () => void) {
  const mq = window.matchMedia(DESKTOP)
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

/**
 * Actividad reciente, secundaria y colapsable: abierta en escritorio y oculta tras
 * "Ver actividad" en móvil. Sin elección del usuario, la visibilidad la decide el CSS
 * (sin salto de diseño al hidratar).
 */
export function ActivityPanel({ children }: { children: React.ReactNode }) {
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false)
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? isDesktop
  const contentId = useId()

  return (
    <section aria-labelledby={`${contentId}-titulo`} className="rounded-md border border-borde bg-superficie">
      <h2 id={`${contentId}-titulo`} className="font-display text-h3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setChoice(!open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left md:min-h-0 md:px-6 md:py-4"
        >
          Actividad reciente
          <span className="flex items-center gap-1 font-sans text-small font-medium text-acento">
            {choice === null ? (
              <>
                <span className="md:hidden">Ver actividad</span>
                <span className="hidden md:inline">Ocultar</span>
              </>
            ) : open ? (
              "Ocultar"
            ) : (
              "Ver actividad"
            )}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform duration-150 ease-out",
                choice === null ? "md:rotate-180" : open && "rotate-180"
              )}
            />
          </span>
        </button>
      </h2>
      <div
        id={contentId}
        className={cn("px-4 pb-2 md:px-6", choice === null ? "hidden md:block" : open ? "block" : "hidden")}
      >
        {children}
      </div>
    </section>
  )
}
