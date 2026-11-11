"use client"

import { ArchiveIcon, ArchiveRestoreIcon, DownloadIcon, ExternalLinkIcon, FilePlus2Icon, MoreHorizontalIcon, PencilRulerIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FORM_CATEGORY_LABELS } from "@/components/formularios/labels"
import { createTemplate, exportFormCsv, setTemplateArchived } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { FormCategory, FormTemplateListItem } from "@/lib/types"

type Option = { id: string; name: string }
const CATEGORIES = Object.keys(FORM_CATEGORY_LABELS) as FormCategory[]
const field = "flex flex-col gap-1.5"
const PATH = "/app/formularios"

export function ExportFormCsvButton({ code }: { code: string }) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`${code}-respuestas-${todayIsoDate()}.csv`, await exportFormCsv(code)) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function NewTemplateSheet({ processes }: { processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<FormCategory>("inspeccion")
  const [processId, setProcessId] = useState("")
  const [description, setDescription] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    start(async () => {
      const r = await createTemplate({
        title, category, processId: processId || null, description: description.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      router.push(`${PATH}/${r.data.code}/disenar`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nueva plantilla</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva plantilla</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="tpl-title">Título</Label>
            <Input id="tpl-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Inspección de EPP" />
          </div>
          <div className={field}><Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FormCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{FORM_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Proceso (opcional)</Label>
            <Select value={processId || "none"} onValueChange={(v) => setProcessId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin proceso)</SelectItem>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="tpl-desc">Descripción (opcional)</Label>
            <Textarea id="tpl-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear y diseñar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function TemplateRowMenu({ item }: { item: FormTemplateListItem }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const href = `${PATH}/${item.code}`

  function toggleArchive() {
    const archive = item.status !== "archivado"
    if (archive && !confirm("La plantilla se archivará (se conserva el histórico). ¿Continuar?")) return
    start(async () => {
      const r = await setTemplateArchived(item.id, archive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(archive ? "Plantilla archivada." : "Plantilla restaurada."); router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${item.code}`} onClick={(e) => e.stopPropagation()} disabled={pending}>
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild className="min-h-9 text-body">
          <Link href={href}><ExternalLinkIcon aria-hidden="true" /> Ver ficha y respuestas</Link>
        </DropdownMenuItem>
        {item.canManage && (
          <DropdownMenuItem asChild className="min-h-9 text-body">
            <Link href={`${href}/disenar`}><PencilRulerIcon aria-hidden="true" /> Diseñar</Link>
          </DropdownMenuItem>
        )}
        {item.status === "publicado" && (
          <DropdownMenuItem asChild className="min-h-9 text-body">
            <Link href={`${href}/responder`}><FilePlus2Icon aria-hidden="true" /> Diligenciar</Link>
          </DropdownMenuItem>
        )}
        {item.canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-9 text-body" onSelect={toggleArchive}>
              {item.status === "archivado"
                ? <><ArchiveRestoreIcon aria-hidden="true" /> Restaurar</>
                : <><ArchiveIcon aria-hidden="true" /> Archivar</>}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
