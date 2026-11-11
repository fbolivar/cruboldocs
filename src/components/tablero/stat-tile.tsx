import Link from "next/link"

type Tone = "exito" | "advertencia" | "error" | "info" | "neutro"
const TEXT: Record<Tone, string> = {
  exito: "text-exito-texto", advertencia: "text-advertencia-texto", error: "text-error-texto",
  info: "text-acento", neutro: "text-texto",
}

/** Tile de KPI: etiqueta + número grande (realce opcional) + enlace "ver detalle". */
export function StatTile({ label, value, tone = "neutro", href, detail }: {
  label: string
  value: React.ReactNode
  tone?: Tone
  href?: string
  detail?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption text-texto-sec">{label}</p>
      <p className={`font-display text-h2 tabular-nums ${TEXT[tone]}`}>{value}</p>
      {href && (
        <Link href={href} className="text-caption font-medium text-acento hover:underline print:hidden">
          {detail ?? "ver detalle"}
        </Link>
      )}
    </div>
  )
}
