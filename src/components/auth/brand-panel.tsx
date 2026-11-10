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
 * Ilustración geométrica: cubos isométricos (caras clara/media/oscura con los acentos de marca)
 * y anillos orbitales. Solo escritorio; decorativa.
 */
function GeoIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      className="relative mt-auto hidden w-full max-w-sm self-center md:block"
    >
      {/* anillos orbitales */}
      <g fill="none" className="stroke-superficie" strokeOpacity="0.5" strokeWidth="2">
        <ellipse cx="200" cy="200" rx="150" ry="52" transform="rotate(-18 200 200)" />
        <ellipse cx="200" cy="200" rx="150" ry="52" transform="rotate(26 200 200)" />
      </g>
      <circle cx="54" cy="168" r="6" className="fill-acento-claro" />
      <circle cx="350" cy="236" r="6" className="fill-superficie" />
      <circle cx="320" cy="150" r="4" className="fill-superficie" fillOpacity="0.7" />

      {/* placa base */}
      <polygon
        points="200,184 320,244 200,304 80,244"
        className="fill-superficie"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeOpacity="0.22"
      />

      {/* cubo trasero */}
      <g transform="translate(200 70)">
        <polygon points="0,0 52,26 0,52 -52,26" className="fill-acento-claro" />
        <polygon points="-52,26 -52,86 0,112 0,52" className="fill-acento-medio" />
        <polygon points="0,52 0,112 52,86 52,26" className="fill-acento" />
      </g>
      {/* cubo frontal izquierda */}
      <g transform="translate(150 118)">
        <polygon points="0,0 46,23 0,46 -46,23" className="fill-acento-claro" />
        <polygon points="-46,23 -46,76 0,99 0,46" className="fill-acento-medio" />
        <polygon points="0,46 0,99 46,76 46,23" className="fill-acento-hover" />
      </g>
      {/* cubo frontal derecha */}
      <g transform="translate(250 118)">
        <polygon points="0,0 46,23 0,46 -46,23" className="fill-acento-claro" fillOpacity="0.85" />
        <polygon points="-46,23 -46,76 0,99 0,46" className="fill-acento-medio" />
        <polygon points="0,46 0,99 46,76 46,23" className="fill-acento" />
      </g>
    </svg>
  )
}

/**
 * Panel de marca del acceso: único lugar de la app con el gradiente de marca.
 * Escritorio: columna con logo, promesa, párrafo de valor e ilustración geométrica.
 * Móvil: franja superior de 120px con el logo y la promesa en una línea.
 */
export function BrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative flex h-36 flex-col justify-center overflow-hidden bg-linear-135 from-acento via-acento-medio to-acento-claro px-6 text-superficie",
        "md:h-auto md:justify-start md:p-12",
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
      <div className="relative mt-9 hidden max-w-sm md:block">
        <h2 className="font-display text-h1 font-semibold">Tu sistema de gestión, bajo control.</h2>
        <p className="mt-3.5 text-body-lg text-acento-suave">
          Control documental y gestión de riesgos en un solo lugar: documentos vigentes, trazabilidad de
          firmas y lecturas, y riesgos medidos. Preciso, confiable y claro.
        </p>
      </div>
      <p className="relative my-auto max-w-sm font-display text-h1 font-semibold md:hidden">
        Documentos vigentes, riesgos bajo control.
      </p>
      <GeoIllustration />
    </aside>
  )
}
