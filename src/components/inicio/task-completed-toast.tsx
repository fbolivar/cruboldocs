"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

/**
 * Éxito al volver de completar una tarea: la pantalla de origen redirige a
 * `/app?completada=1`; se muestra el toast y se limpia el parámetro de la URL.
 */
export function TaskCompletedToast({ show }: { show: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (!show) return
    toast.success("Tarea completada")
    router.replace(pathname, { scroll: false })
  }, [show, router, pathname])
  return null
}
