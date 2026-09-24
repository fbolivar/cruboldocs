import { Badge } from "@/components/ui/badge"
import { getRecertification } from "@/lib/data/queries"

/** Pendientes de recertificación junto a la pestaña; si la consulta falla, no se muestra. */
export async function RecertBadge() {
  const pending = await getRecertification().then(
    (r) => r.items.length,
    () => 0
  )
  if (pending === 0) return null
  return (
    <Badge tone="advertencia" plain>
      {pending}
      <span className="sr-only"> pendientes</span>
    </Badge>
  )
}
