"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

/**
 * Filtros sincronizados con la URL (compartibles). `set` reemplaza la URL sin
 * scroll y reinicia la paginación salvo que se cambie `page` explícitamente.
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const set = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      const q = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === undefined || v === "") q.delete(k)
        else q.set(k, String(v))
      }
      if (!("page" in changes)) q.delete("page")
      const s = q.toString()
      startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }))
    },
    [params, pathname, router]
  )

  return { params, set, pending }
}
