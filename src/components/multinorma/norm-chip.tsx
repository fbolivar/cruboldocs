import { Badge } from "@/components/ui/badge"
import type { NormOption } from "@/lib/types"

/** Chip del código de norma (p. ej. "45001"); reutilizable en listas y fichas. */
export function NormChip({ code }: { code: string }) {
  return <Badge tone="info" plain>{code}</Badge>
}

/** Fila de chips de las normas etiquetadas. */
export function NormChips({ norms }: { norms: Pick<NormOption, "id" | "code">[] }) {
  if (norms.length === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {norms.map((n) => <NormChip key={n.id} code={n.code} />)}
    </span>
  )
}
