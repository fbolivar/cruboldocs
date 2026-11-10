import { Card } from "@/components/ui/card"
import type { SnapshotBlock } from "@/components/revisiones/labels"

const TONE_CLASS: Record<string, string> = {
  texto: "text-texto",
  exito: "text-exito-texto",
  advertencia: "text-advertencia-texto",
  error: "text-error-texto",
}

/** Tarjeta de un bloque del snapshot: título + 2–4 métricas con su número y etiqueta. */
export function SnapshotCard({ block }: { block: SnapshotBlock }) {
  return (
    <Card className="p-4">
      <p className="text-small font-medium text-texto-sec">{block.title}</p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {block.items.map((it) => (
          <div key={it.label}>
            <p className={`font-display text-h3 tabular-nums ${TONE_CLASS[it.tone ?? "texto"]}`}>{it.value}</p>
            <p className="text-caption text-texto-sec">{it.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
