import type { ChartKind } from "@/lib/bi/datasets"

// Gráficas en SVG inline, sin librería (regla de dependencias). Paleta de tokens del sistema.
const COLORS = ["var(--color-acento)", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d", "#ca8a04"]

export function ReportChart({ kind, labels, values }: { kind: ChartKind; labels: string[]; values: number[] }) {
  if (labels.length === 0) return null
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0) || 1

  if (kind === "barra") {
    return (
      <div className="flex flex-col gap-2" role="img" aria-label="Gráfica de barras">
        {labels.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-caption text-texto-sec" title={l}>{l}</span>
            <div className="h-5 flex-1 rounded bg-superficie-alt">
              <div className="h-5 rounded" style={{ width: `${(values[i] / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
            </div>
            <span className="w-12 shrink-0 text-right text-caption tabular-nums text-texto">{values[i]}</span>
          </div>
        ))}
      </div>
    )
  }

  if (kind === "linea") {
    const w = 480, h = 160, pad = 24
    const step = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0
    const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const)
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Gráfica de línea">
        <polyline points={`${pad},${h - pad} ${w - pad},${h - pad}`} fill="none" stroke="var(--color-borde)" strokeWidth="1" />
        <path d={d} fill="none" stroke="var(--color-acento)" strokeWidth="2" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--color-acento)" />)}
        {labels.map((l, i) => <text key={i} x={pad + i * step} y={h - 6} textAnchor="middle" className="fill-texto-sec" fontSize="9">{l.length > 8 ? l.slice(0, 8) + "…" : l}</text>)}
      </svg>
    )
  }

  // torta
  const r = 70, cx = 80, cy = 80
  const ends = values.reduce<number[]>((a, v) => [...a, (a[a.length - 1] ?? 0) + v], [])
  const arcs = values.map((v, i) => {
    const a0 = ((i > 0 ? ends[i - 1] : 0) / total) * 2 * Math.PI
    const a1 = (ends[i] / total) * 2 * Math.PI
    const large = a1 - a0 > Math.PI ? 1 : 0
    const x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0)
    const x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1)
    return { d: `M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`, color: COLORS[i % COLORS.length] }
  })
  return (
    <div className="flex flex-wrap items-center gap-4" role="img" aria-label="Gráfica de torta">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
      </svg>
      <ul className="flex flex-col gap-1">
        {labels.map((l, i) => (
          <li key={i} className="flex items-center gap-2 text-caption text-texto-sec">
            <span className="size-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate" title={l}>{l}</span>
            <span className="tabular-nums text-texto">{values[i]} ({Math.round((values[i] / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
