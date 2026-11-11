"use client"

import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FIELD_PALETTE, FIELD_TYPE_LABELS, FORM_CATEGORY_LABELS, OPTION_TYPES, RANGE_TYPES } from "@/components/formularios/labels"
import {
  addField, newTemplateVersion, publishTemplate, removeField, setFieldOrder, updateField, updateTemplateData,
} from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { FieldType, FormCategory, FormFieldView, FormTemplateDetail } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const CATEGORIES = Object.keys(FORM_CATEGORY_LABELS) as FormCategory[]

export function FormDesigner({ template, processes }: { template: FormTemplateDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<FormFieldView | null>(null)
  const editable = template.hasOpenDraft && template.canManage

  function add(type: FieldType) {
    start(async () => {
      const r = await addField(template.id, type, FIELD_TYPE_LABELS[type])
      if (!r.ok) { toast.error(r.error); return }
      router.refresh()
    })
  }
  function remove(f: FormFieldView) {
    if (!confirm(`Eliminar el campo «${f.label}»?`)) return
    start(async () => {
      const r = await removeField(f.id)
      if (!r.ok) { toast.error(r.error); return }
      router.refresh()
    })
  }
  function move(index: number, dir: -1 | 1) {
    const ids = template.fields.map((f) => f.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    start(async () => {
      const r = await setFieldOrder(template.id, ids)
      if (!r.ok) { toast.error(r.error); return }
      router.refresh()
    })
  }
  function publish() {
    if (!confirm("La plantilla quedará disponible para diligenciar y sus campos se congelan. ¿Publicar?")) return
    start(async () => {
      const r = await publishTemplate(template.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Plantilla publicada."); router.refresh()
    })
  }
  function newVersion() {
    if (!confirm("Se creará un borrador nuevo (clona los campos publicados). La versión publicada sigue vigente. ¿Continuar?")) return
    start(async () => {
      const r = await newTemplateVersion(template.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Nueva versión creada."); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TemplateDataSheet template={template} processes={processes} disabled={!template.canManage || template.status === "archivado"} />
        </div>
        <div className="flex items-center gap-2">
          {editable ? (
            <Button onClick={publish} loading={pending} disabled={template.fields.filter((f) => f.type !== "seccion").length === 0}>Publicar</Button>
          ) : template.status === "publicado" && template.canManage ? (
            <Button onClick={newVersion} loading={pending}>Nueva versión</Button>
          ) : null}
        </div>
      </div>

      {template.status === "publicado" && !template.hasOpenDraft && (
        <p className="rounded-md border border-borde bg-superficie-alt p-3 text-small text-texto-sec">
          Esta versión está publicada (solo lectura). Usa «Nueva versión» para editarla sin afectar las respuestas ya recolectadas.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        {/* Lienzo */}
        <Card className="p-4">
          {template.fields.length === 0 ? (
            <EmptyState icon={PlusIcon} title="Añade el primer campo." description={editable ? "Elígelo en la paleta «Añadir campo»." : "Esta versión no tiene campos."} />
          ) : (
            <ul className="flex flex-col gap-2">
              {template.fields.map((f, i) => (
                <li key={f.id} className="flex items-center gap-2 rounded-md border border-borde p-2.5">
                  <GripVerticalIcon className="size-4 shrink-0 text-texto-sec" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    {f.type === "seccion" ? (
                      <p className="text-small font-semibold uppercase tracking-wide text-texto-sec">— {f.label} —</p>
                    ) : (
                      <p className="truncate text-body">
                        <span className="text-texto-sec">{i + 1}.</span> {f.label}
                        {f.required && <span className="text-error-texto"> *</span>}
                        <span className="text-caption text-texto-sec"> ({FIELD_TYPE_LABELS[f.type]})</span>
                      </p>
                    )}
                  </div>
                  {editable && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label="Subir" onClick={() => move(i, -1)} disabled={i === 0 || pending}><ChevronUpIcon /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Bajar" onClick={() => move(i, 1)} disabled={i === template.fields.length - 1 || pending}><ChevronDownIcon /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Editar campo" onClick={() => setEditing(f)}><PencilIcon /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar campo" onClick={() => remove(f)} disabled={pending}><Trash2Icon /></Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Paleta */}
        {editable && (
          <Card className="h-fit p-4">
            <p className="mb-2 text-caption font-medium uppercase tracking-wide text-texto-sec">Añadir campo</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {FIELD_PALETTE.map((t) => (
                <Button key={t} variant="outline" size="sm" className="justify-start" onClick={() => add(t)} disabled={pending}>
                  <PlusIcon /> {FIELD_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {editing && (
        <FieldEditorSheet
          key={editing.id} field={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function TemplateDataSheet({ template, processes, disabled }: { template: FormTemplateDetail; processes: Option[]; disabled: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(template.title)
  const [category, setCategory] = useState<FormCategory>(template.category)
  const [processId, setProcessId] = useState(template.processId ?? "")
  const [description, setDescription] = useState(template.description ?? "")

  function submit() {
    if (title.trim().length < 3) { toast.error("El título debe tener al menos 3 caracteres."); return }
    start(async () => {
      const r = await updateTemplateData(template.id, { title, category, processId: processId || null, description: description.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Datos actualizados."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}><PencilIcon /> Datos de la plantilla</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Datos de la plantilla</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="td-title">Título</Label>
            <Input id="td-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <div className={field}><Label htmlFor="td-desc">Descripción (opcional)</Label>
            <Textarea id="td-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FieldEditorSheet({ field: f, onClose, onSaved }: { field: FormFieldView; onClose: () => void; onSaved: () => void }) {
  const [pending, start] = useTransition()
  const [label, setLabel] = useState(f.label)
  const [help, setHelp] = useState(f.help ?? "")
  const [required, setRequired] = useState(f.required)
  const [options, setOptions] = useState<string[]>(f.options ?? [])
  const [min, setMin] = useState(f.config?.min !== undefined ? String(f.config.min) : "")
  const [max, setMax] = useState(f.config?.max !== undefined ? String(f.config.max) : "")

  const hasOptions = OPTION_TYPES.includes(f.type)
  const hasRange = RANGE_TYPES.includes(f.type)
  const isSection = f.type === "seccion"

  function submit() {
    if (label.trim().length < 1) { toast.error("La etiqueta es obligatoria."); return }
    if (hasOptions && options.filter((o) => o.trim()).length < 1) { toast.error("Agrega al menos una opción."); return }
    const config = hasRange
      ? { ...(min !== "" ? { min: Number(min) } : {}), ...(max !== "" ? { max: Number(max) } : {}) }
      : null
    start(async () => {
      const r = await updateField(f.id, {
        label, help: help.trim() || undefined, required: isSection ? false : required,
        options: hasOptions ? options.map((o) => o.trim()).filter(Boolean) : undefined,
        config: config && Object.keys(config).length ? config : null,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Campo guardado."); onSaved()
    })
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Campo · {FIELD_TYPE_LABELS[f.type]}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="fe-label">Etiqueta</Label>
            <Input id="fe-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="fe-help">Ayuda (opcional)</Label>
            <Input id="fe-help" value={help} onChange={(e) => setHelp(e.target.value)} />
          </div>
          {!isSection && (
            <label className="flex items-center justify-between gap-2">
              <span className="text-body">Obligatorio</span>
              <Switch checked={required} onCheckedChange={setRequired} />
            </label>
          )}
          {hasOptions && <OptionsEditor options={options} onChange={setOptions} />}
          {hasRange && (
            <div className="grid grid-cols-2 gap-3">
              <div className={field}><Label htmlFor="fe-min">Mínimo{f.type === "puntaje" ? " (def. 0)" : ""}</Label>
                <Input id="fe-min" type="number" value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div className={field}><Label htmlFor="fe-max">Máximo{f.type === "puntaje" ? " (def. 100)" : ""}</Label>
                <Input id="fe-max" type="number" value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar campo</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const set = (i: number, v: string) => onChange(options.map((o, j) => (j === i ? v : o)))
  const removeAt = (i: number) => onChange(options.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= options.length) return
    const next = [...options]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className={field}>
      <Label>Opciones</Label>
      <div className="flex flex-col gap-1.5">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input value={o} onChange={(e) => set(i, e.target.value)} placeholder={`Opción ${i + 1}`} />
            <Button variant="ghost" size="icon-sm" aria-label="Subir opción" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUpIcon /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Bajar opción" onClick={() => move(i, 1)} disabled={i === options.length - 1}><ChevronDownIcon /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Eliminar opción" onClick={() => removeAt(i)}><XIcon /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={() => onChange([...options, ""])}><PlusIcon /> Añadir opción</Button>
      </div>
    </div>
  )
}
