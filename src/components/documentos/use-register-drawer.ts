"use client"

import { useSearchParams } from "next/navigation"
import { useCallback } from "react"

const KEY = "registrar"

/**
 * Estado del panel "Registrar documento" en la URL (`?registrar=1`), enlazable.
 * Usa la History API nativa: Next sincroniza useSearchParams sin pedir de nuevo la página.
 */
export function useRegisterDrawer() {
  const params = useSearchParams()
  const open = params.get(KEY) === "1"

  const setOpen = useCallback((next: boolean) => {
    const url = new URL(window.location.href)
    if (next) url.searchParams.set(KEY, "1")
    else url.searchParams.delete(KEY)
    window.history.replaceState(null, "", `${url.pathname}${url.search}`)
  }, [])

  return { open, setOpen }
}
