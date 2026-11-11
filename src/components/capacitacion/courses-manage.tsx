"use client"

import { ArchiveIcon, ArchiveRestoreIcon, CheckCircle2Icon, DownloadIcon, ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, PlayIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createCourse, exportCourseResultsCsv, publishCourse, setCourseArchived, updateCourseData } from "@/lib/data/actions"
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
import type { CourseDetail, CourseListItem } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const PATH = "/app/capacitacion"

export function ExportCourseResultsCsvButton({ code }: { code: string }) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`${code}-resultados-${todayIsoDate()}.csv`, await exportCourseResultsCsv(code)) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function NewCourseSheet({ processes }: { processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [processId, setProcessId] = useState("")
  const [description, setDescription] = useState("")
  const [passing, setPassing] = useState("70")

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    const score = Number(passing)
    if (!Number.isInteger(score) || score < 0 || score > 100) { toast.error("El umbral debe ser un entero entre 0 y 100."); return }
    start(async () => {
      const r = await createCourse({
        title, processId: processId || null, description: description.trim() || undefined, passingScore: score,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      router.push(`${PATH}/${r.data.code}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nuevo curso</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo curso</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="course-title">Título</Label>
            <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p. ej. Inducción en SST" />
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
          <div className={field}><Label htmlFor="course-desc">Descripción (opcional)</Label>
            <Textarea id="course-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="course-passing">Umbral de aprobación %</Label>
            <Input id="course-passing" type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} className="w-28" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear y diseñar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CourseDataSheet({ course, processes }: { course: CourseDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(course.title)
  const [processId, setProcessId] = useState(course.processId ?? "")
  const [description, setDescription] = useState(course.description ?? "")
  const [content, setContent] = useState(course.content ?? "")
  const [passing, setPassing] = useState(String(course.passingScore))

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    const score = Number(passing)
    if (!Number.isInteger(score) || score < 0 || score > 100) { toast.error("El umbral debe ser un entero entre 0 y 100."); return }
    start(async () => {
      const r = await updateCourseData(course.id, {
        title, processId: processId || null, description: description.trim() || undefined,
        content: content.trim() || undefined, passingScore: score,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      toast.success("Curso actualizado."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar curso</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="ec-title">Título</Label>
            <Input id="ec-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <div className={field}><Label htmlFor="ec-desc">Descripción (opcional)</Label>
            <Textarea id="ec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="ec-content">Material del curso (opcional)</Label>
            <Textarea id="ec-content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Texto del curso o enlace al recurso." />
          </div>
          <div className={field}><Label htmlFor="ec-passing">Umbral de aprobación %</Label>
            <Input id="ec-passing" type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} className="w-28" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function PublishCourseButton({ course }: { course: CourseDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const activeQuestions = course.questions.length
  function run() {
    if (activeQuestions === 0) { toast.error("Agrega al menos una pregunta antes de publicar."); return }
    if (!confirm("El curso quedará disponible para tomarse. ¿Continuar?")) return
    start(async () => {
      const r = await publishCourse(course.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Curso publicado."); router.refresh()
    })
  }
  return <Button size="sm" onClick={run} loading={pending} disabled={activeQuestions === 0}><CheckCircle2Icon /> Publicar</Button>
}

export function CourseRowMenu({ item }: { item: CourseListItem }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const href = `${PATH}/${item.code}`

  function toggleArchive() {
    const archive = item.status !== "archivado"
    if (archive && !confirm("El curso se archivará (se conserva el histórico). ¿Continuar?")) return
    start(async () => {
      const r = await setCourseArchived(item.id, archive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(archive ? "Curso archivado." : "Curso restaurado."); router.refresh()
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
          <Link href={href}><ExternalLinkIcon aria-hidden="true" /> Ver ficha y resultados</Link>
        </DropdownMenuItem>
        {item.status === "publicado" && (
          <DropdownMenuItem asChild className="min-h-9 text-body">
            <Link href={`${href}/tomar`}><PlayIcon aria-hidden="true" /> Tomar</Link>
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
