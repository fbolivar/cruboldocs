import { LogoHex, Wordmark } from "@/components/ui/logo-hex"
import { cn } from "@/lib/utils"

/** Patrón hexagonal tenue (≤ 6 %) en el color del texto del panel. */
function HexPattern() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-6">
      <defs>
        <pattern id="auth-hex-pattern" width="56" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M14 1 28 1 35 13 28 25 14 25 7 13Z M42 25 56 25 63 37 56 49 42 49 35 37Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-hex-pattern)" />
    </svg>
  )
}

/**
 * Panel de marca del acceso: único lugar de la app con el gradiente de marca.
 * Escritorio: columna del 40 % con logo y promesa. Móvil: franja superior de 120px solo con el logo.
 */
export function BrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative flex h-30 flex-col justify-center overflow-hidden bg-linear-135 from-acento via-acento-medio to-acento-claro px-4 text-superficie",
        "md:h-auto md:justify-start md:rounded-r-lg md:p-12",
        className
      )}
    >
      <HexPattern />
      <div className="relative flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-sm bg-superficie">
          <LogoHex className="size-7" />
        </span>
        <Wordmark className="text-h2" />
      </div>
      <p className="relative my-auto hidden max-w-sm font-display text-h1 font-semibold md:block">
        Documentos vigentes, riesgos bajo control.
      </p>
    </aside>
  )
}
