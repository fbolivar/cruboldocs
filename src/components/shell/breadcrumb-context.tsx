"use client"

import { createContext, useContext, useEffect, useState } from "react"

const Ctx = createContext<{ label: string | null; setLabel: (l: string | null) => void }>({
  label: null,
  setLabel: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null)
  return <Ctx.Provider value={{ label, setLabel }}>{children}</Ctx.Provider>
}

export function useBreadcrumbLabel(): string | null {
  return useContext(Ctx).label
}

/** Una página de detalle declara el último nivel del breadcrumb (p. ej. el código del documento). */
export function SetBreadcrumb({ label }: { label: string }) {
  const { setLabel } = useContext(Ctx)
  useEffect(() => {
    setLabel(label)
    return () => setLabel(null)
  }, [label, setLabel])
  return null
}
