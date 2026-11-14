"use client"

import { DownloadIcon, UploadIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { ImportPreviewTable } from "@/components/admin/import-preview-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { commitImport, previewImport } from "@/lib/data/actions"
import { downloadCsv, toCsv } from "@/lib/csv"
import { IMPORT_ENTITIES, IMPORT_ENTITY_KEYS, type ImportEntity } from "@/lib/import/schema"
import type { ImportResult } from "@/lib/types"

export function ImportPanel() {
  const [entity, setEntity] = useState<ImportEntity>("procesos")
  const [csv, setCsv] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const def = IMPORT_ENTITIES[entity]

  function pickEntity(v: string) {
    setEntity(v as ImportEntity); setCsv(""); setFileName(""); setResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function downloadTemplate() {
    const csvText = toCsv([def.example], def.columns.map((c) => ({ header: c.key, value: (r: Record<string, string>) => r[c.key] ?? "" })))
    downloadCsv(`plantilla-${entity}.csv`, csvText)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setResult(null)
    const text = await file.text()
    setCsv(text)
    start(async () => {
      const r = await previewImport(entity, text)
      if (!r.ok) { toast.error(r.error); setCsv(""); return }
      setResult(r.data)
    })
  }

  function confirm() {
    if (!csv) return
    start(async () => {
      const r = await commitImport(entity, csv)
      if (!r.ok) { toast.error(r.error); return }
      setResult(r.data)
      toast.success(`${r.data.created} creadas${r.data.errors ? `, ${r.data.errors} omitidas` : ""}.`)
    })
  }

  const committed = result?.committed ?? false
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <Label>Qué importar</Label>
          <Select value={entity} onValueChange={pickEntity}>
            <SelectTrigger className="sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMPORT_ENTITY_KEYS.map((k) => <SelectItem key={k} value={k}>{IMPORT_ENTITIES[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-caption text-texto-sec">{def.description}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-caption font-medium text-texto-sec">Columnas esperadas</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-texto-sec">
            {def.columns.map((c) => (
              <li key={c.key}><span className="font-mono text-texto">{c.key}</span>{c.required ? <span className="text-error-texto">*</span> : ""}{c.hint ? ` — ${c.hint}` : ""}</li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="self-start"><DownloadIcon /> Descargar plantilla CSV</Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="imp-file">Archivo CSV (máx. 1000 filas)</Label>
          <input id="imp-file" ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} disabled={pending}
            className="text-small file:mr-3 file:rounded-md file:border file:border-borde file:bg-superficie file:px-3 file:py-1.5 file:text-small file:text-texto" />
          {fileName && <p className="text-caption text-texto-sec">{fileName}</p>}
        </div>
      </Card>

      {result && (
        <Card className="flex flex-col gap-4 p-4">
          <ImportPreviewTable result={result} />
          {!committed && result.valid > 0 && (
            <Button onClick={confirm} loading={pending} className="self-start">
              <UploadIcon /> Importar {result.valid} {result.valid === 1 ? "válida" : "válidas"}
            </Button>
          )}
          {!committed && result.valid === 0 && (
            <p className="text-small text-texto-sec">Corrige los errores y vuelve a cargar el archivo.</p>
          )}
        </Card>
      )}
    </div>
  )
}
