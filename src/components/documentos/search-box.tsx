"use client"

import { SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300

/**
 * Búsqueda por código o título con debounce. `value` es el valor de la URL; si cambia
 * desde fuera (p. ej. "Limpiar"), el campo se sincroniza.
 */
export function SearchBox({
  value,
  onSearch,
  className,
}: {
  value: string
  onSearch: (q: string | null) => void
  className?: string
}) {
  const [text, setText] = useState(value)
  const [lastSent, setLastSent] = useState(value)

  // Sincronización durante el render (patrón recomendado por React en lugar de un efecto).
  if (value !== lastSent) {
    setLastSent(value)
    setText(value)
  }

  useEffect(() => {
    if (text === lastSent) return
    const t = setTimeout(() => {
      setLastSent(text)
      onSearch(text.trim() ? text : null)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [text, lastSent, onSearch])

  return (
    <div className={cn("relative", className)}>
      <label htmlFor="buscar-documentos" className="sr-only">
        Buscar por código o título
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
      <Input
        id="buscar-documentos"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Código o título"
        autoComplete="off"
        className="pl-9"
      />
    </div>
  )
}
