"use client"

import { ArchiveIcon, ArchiveRestoreIcon, DownloadIcon, ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { KNOWLEDGE_CATEGORY_LABELS } from "@/components/conocimiento/labels"
import { createKnowledgeArticle, exportKnowledgeCsv, setArticleArchived, updateKnowledgeArticle } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { KnowledgeCategory, KnowledgeDetail, KnowledgeListItem } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const PATH = "/app/conocimiento"
const CATEGORIES = Object.keys(KNOWLEDGE_CATEGORY_LABELS) as KnowledgeCategory[]

export function ExportKnowledgeCsvButton() {
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => {
      try { downloadCsv(`conocimiento-${todayIsoDate()}.csv`, await exportKnowledgeCsv()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })}><DownloadIcon /> Exportar CSV</Button>
  )
}

function ArticleFields({
  title, setTitle, category, setCategory, processId, setProcessId, content, setContent, source, setSource, processes,
}: {
  title: string; setTitle: (v: string) => void
  category: KnowledgeCategory; setCategory: (v: KnowledgeCategory) => void
  processId: string; setProcessId: (v: string) => void
  content: string; setContent: (v: string) => void
  source: string; setSource: (v: string) => void
  processes: Option[]
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className={field}><Label htmlFor="kn-title">Título</Label>
        <Input id="kn-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className={field}><Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as KnowledgeCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{KNOWLEDGE_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
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
      <div className={field}><Label htmlFor="kn-content">Contenido</Label>
        <Textarea id="kn-content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="El conocimiento (texto/markdown)." />
      </div>
      <div className={field}><Label htmlFor="kn-source">Fuente / origen (opcional)</Label>
        <Input id="kn-source" value={source} onChange={(e) => setSource(e.target.value)} />
      </div>
    </div>
  )
}

export function NewArticleSheet({ processes }: { processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<KnowledgeCategory>("buenas_practicas")
  const [processId, setProcessId] = useState("")
  const [content, setContent] = useState("")
  const [source, setSource] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    if (content.trim().length < 1) { toast.error("Escribe el contenido."); return }
    start(async () => {
      const r = await createKnowledgeArticle({ title, category, processId: processId || null, content, source: source.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false); router.push(`${PATH}/${r.data.code}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nuevo artículo</Button></SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo artículo</SheetTitle></SheetHeader>
        <ArticleFields {...{ title, setTitle, category, setCategory, processId, setProcessId, content, setContent, source, setSource, processes }} />
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function EditArticleSheet({ article, processes }: { article: KnowledgeDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(article.title)
  const [category, setCategory] = useState<KnowledgeCategory>(article.category)
  const [processId, setProcessId] = useState(article.processId ?? "")
  const [content, setContent] = useState(article.content)
  const [source, setSource] = useState(article.source ?? "")

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    if (content.trim().length < 1) { toast.error("Escribe el contenido."); return }
    start(async () => {
      const r = await updateKnowledgeArticle(article.id, { title, category, processId: processId || null, content, source: source.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false); toast.success("Artículo actualizado."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar artículo</SheetTitle></SheetHeader>
        <ArticleFields {...{ title, setTitle, category, setCategory, processId, setProcessId, content, setContent, source, setSource, processes }} />
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ArticleRowMenu({ item }: { item: KnowledgeListItem }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const href = `${PATH}/${item.code}`
  function toggleArchive() {
    const archive = item.status !== "archivado"
    if (archive && !confirm("El artículo se archivará. ¿Continuar?")) return
    start(async () => {
      const r = await setArticleArchived(item.id, archive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(archive ? "Artículo archivado." : "Artículo restaurado."); router.refresh()
    })
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${item.code}`} onClick={(e) => e.stopPropagation()} disabled={pending}>
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild className="min-h-9 text-body"><Link href={href}><ExternalLinkIcon aria-hidden="true" /> Ver</Link></DropdownMenuItem>
        {item.canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-9 text-body" onSelect={toggleArchive}>
              {item.status === "archivado" ? <><ArchiveRestoreIcon aria-hidden="true" /> Restaurar</> : <><ArchiveIcon aria-hidden="true" /> Archivar</>}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
