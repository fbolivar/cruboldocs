import { useId } from "react"

import { cn } from "@/lib/utils"

/** Isotipo: hexágono abierto con gradiente de marca (único uso del gradiente en la app). */
export function LogoHex({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-acento)" />
          <stop offset=".55" stopColor="var(--color-acento-medio)" />
          <stop offset="1" stopColor="var(--color-acento-claro)" />
        </linearGradient>
      </defs>
      <path
        d="M22.5 5.2 16 1.5 3.9 8.5v15L16 30.5l12.1-7"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 12.5h10M11 16.5h10M11 20.5h6" stroke="var(--color-acento)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-h3 font-semibold", className)}>CrubolDocs</span>
}
