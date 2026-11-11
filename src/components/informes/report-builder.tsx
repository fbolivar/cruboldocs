"use client"

import { DownloadIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { ReportChart } from "@/components/informes/report-chart"
import { ReportTable } from "@/components/informes/report-table"
import { SaveReportSheet } from "@/components/informes/save-report-sheet"
import { createSavedReport, discardSavedReport, exportReportCsv, runReport, updateSavedReport } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { DATASETS, datasetMeta, type AggFn, type ChartKind, type DatasetKey, type FilterOp, type ReportConfig, type ReportFilter } from "@/lib/bi/datasets"
import type { ReportResult } from "@/lib/bi/compute"
import type { SavedReportView } from "@/lib/types"
import { BarChart3Icon } from "lucide-react"

const OPS: Record<string, { value: FilterOp; label: string }[]> = {
  texto: [{ value: "igual", label: "igual a" }, { value: "contiene", label: "contiene" }],
  enum: [{ value: "igual", label: "igual a" }],
  numero: [{ value: "igual", label: "=" }, { value: "mayor_igual", label: "≥" }, { value: "menor_igual", label: "≤" }],
  fecha: [{ value: "desde", label: "desde" }, { value: "hasta", label: "hasta" }, { value: "igual", label: "igual a" }],
}
const sel = "h-9 rounded-md border border-borde-fuerte bg-superficie px-2 text-small"

export function ReportBuilder({ initial, canShare }: { initial: SavedReportView | null; canShare: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [saving, startSave] = useTransition()

  const [dataset, setDataset] = useState<DatasetKey>((initial?.dataset as DatasetKey) ?? "nc")
  const [cfg, setCfg] = useState<ReportConfig>(initial?.config ?? { columns: DATASETS.nc.columns.map((c) => c.field), filters: [], groupBy: null, aggregate: null, chart: null })
  const [result, setResult] = useState<ReportResult | null>(null)

  const meta = datasetMeta(dataset)!
  const groupable = meta.columns.filter((c) => c.groupable)
  const numeric = meta.columns.filter((c) => c.type === "numero")

  // Corre el informe cada vez que cambia la configuración (volumen bajo por organización).
  useEffect(() => {
    start(async () => {
      const r = await runReport(dataset, cfg)
      if (r.ok) setResult(r.data)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, JSON.stringify(cfg)])

  function changeDataset(key: DatasetKey) {
    setDataset(key)
    setCfg({ columns: DATASETS[key].columns.map((c) => c.field), filters: [], groupBy: null, aggregate: null, chart: null })
  }
  function patch(p: Partial<ReportConfig>) { setCfg((c) => ({ ...c, ...p })) }
  function toggleColumn(f: string) {
    setCfg((c) => ({ ...c, columns: c.columns.includes(f) ? c.columns.filter((x) => x !== f) : [...c.columns, f] }))
  }
  function setFilter(i: number, p: Partial<ReportFilter>) {
    setCfg((c) => ({ ...c, filters: c.filters.map((f, idx) => (idx === i ? { ...f, ...p } : f)) }))
  }
  function addFilter() {
    const col = meta.columns[0]
    setCfg((c) => ({ ...c, filters: [...c.filters, { field: col.field, op: OPS[col.type][0].value, value: "" }] }))
  }

  function save(name: string, scope: "privada" | "compartida") {
    startSave(async () => {
      const r = initial
        ? await updateSavedReport({ id: initial.id, name, dataset, scope, config: cfg })
        : await createSavedReport({ name, dataset, scope, config: cfg })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Informe guardado.")
      router.push("/app/informes")
      router.refresh()
    })
  }
  function remove() {
    if (!initial) return
    startSave(async () => {
      const r = await discardSavedReport(initial.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Informe eliminado.")
      router.push("/app/informes")
      router.refresh()
    })
  }
  function csv() {
    start(async () => {
      try { downloadCsv(`informe-${dataset}-${todayIsoDate()}.csv`, await exportReportCsv(dataset, cfg)) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }

  const inputType = (field: string) => { const t = meta.columns.find((c) => c.field === field)?.type; return t === "fecha" ? "date" : t === "numero" ? "number" : "text" }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Panel de configuración */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-texto-sec">Fuente</label>
          <select value={dataset} onChange={(e) => changeDataset(e.target.value as DatasetKey)} className={`${sel} h-11 md:h-9`}>
            {Object.values(DATASETS).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-texto-sec">Columnas</label>
          <div className="flex flex-wrap gap-1.5">
            {meta.columns.map((c) => (
              <button key={c.field} type="button" onClick={() => toggleColumn(c.field)}
                className={`rounded-full border px-2.5 py-1 text-caption ${cfg.columns.includes(c.field) ? "border-acento bg-acento-suave text-acento" : "border-borde text-texto-sec"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-caption font-medium text-texto-sec">Filtros</label>
            <Button type="button" variant="ghost" size="sm" onClick={addFilter}>+ Filtro</Button>
          </div>
          {cfg.filters.map((f, i) => {
            const type = meta.columns.find((c) => c.field === f.field)?.type ?? "texto"
            return (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <select value={f.field} onChange={(e) => { const nt = meta.columns.find((c) => c.field === e.target.value)?.type ?? "texto"; setFilter(i, { field: e.target.value, op: OPS[nt][0].value }) }} className={sel}>
                  {meta.columns.map((c) => <option key={c.field} value={c.field}>{c.label}</option>)}
                </select>
                <select value={f.op} onChange={(e) => setFilter(i, { op: e.target.value as FilterOp })} className={sel}>
                  {OPS[type].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type={inputType(f.field)} value={f.value} onChange={(e) => setFilter(i, { value: e.target.value })} className={`${sel} min-w-24 flex-1`} />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar filtro" onClick={() => patch({ filters: cfg.filters.filter((_, idx) => idx !== i) })}><Trash2Icon /></Button>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-texto-sec">Agrupar por</label>
          <select value={cfg.groupBy ?? ""} onChange={(e) => patch({ groupBy: e.target.value || null, aggregate: e.target.value ? cfg.aggregate ?? { fn: "count" } : null, chart: e.target.value ? cfg.chart : null })} className={sel}>
            <option value="">(ninguno — detalle)</option>
            {groupable.map((c) => <option key={c.field} value={c.field}>{c.label}</option>)}
          </select>
        </div>

        {cfg.groupBy && (
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-texto-sec">Agregación</label>
            <div className="flex gap-1.5">
              <select value={cfg.aggregate?.fn ?? "count"} onChange={(e) => { const fn = e.target.value as AggFn; patch({ aggregate: fn === "count" ? { fn } : { fn, field: cfg.aggregate?.field ?? numeric[0]?.field } }) }} className={sel}>
                <option value="count">Conteo</option>
                {numeric.length > 0 && <option value="suma">Suma</option>}
                {numeric.length > 0 && <option value="promedio">Promedio</option>}
              </select>
              {cfg.aggregate && cfg.aggregate.fn !== "count" && (
                <select value={cfg.aggregate.field ?? ""} onChange={(e) => patch({ aggregate: { fn: cfg.aggregate!.fn, field: e.target.value } })} className={sel}>
                  {numeric.map((c) => <option key={c.field} value={c.field}>{c.label}</option>)}
                </select>
              )}
            </div>
            <label className="mt-1 text-caption font-medium text-texto-sec">Gráfica</label>
            <select value={cfg.chart ?? ""} onChange={(e) => patch({ chart: (e.target.value || null) as ChartKind | null })} className={sel}>
              <option value="">(sin gráfica)</option>
              <option value="barra">Barras</option>
              <option value="linea">Línea</option>
              <option value="torta">Torta</option>
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-borde pt-3">
          <SaveReportSheet initialName={initial?.name ?? ""} initialScope={initial?.scope ?? "privada"} canShare={canShare} pending={saving} onSave={save} />
          <Button variant="outline" onClick={csv} loading={pending}><DownloadIcon /> CSV</Button>
          {initial?.canEdit && <Button variant="ghost" onClick={remove} loading={saving}><Trash2Icon /> Eliminar</Button>}
        </div>
      </div>

      {/* Resultado */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        {result && result.chart && (
          <div className="rounded-lg border border-borde bg-superficie p-4">
            <ReportChart kind={result.chart.kind} labels={result.chart.labels} values={result.chart.values} />
          </div>
        )}
        <div className="rounded-lg border border-borde bg-superficie p-4">
          {!result || result.rows.length === 0 ? (
            <EmptyState icon={BarChart3Icon} title={cfg.columns.length === 0 && !cfg.groupBy ? "Elige columnas o una agrupación" : "Sin datos para estos filtros"} description="Ajusta la fuente, columnas o filtros." />
          ) : (
            <>
              <p className="mb-2 text-caption text-texto-sec">{result.mode === "agrupado" ? `${result.rows.length} grupos · ${result.total} registros` : `${result.total} registros`}</p>
              <ReportTable result={result} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
