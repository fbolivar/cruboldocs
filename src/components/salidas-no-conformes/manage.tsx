"use client"

import { BanIcon, DownloadIcon, ExternalLinkIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cancelOutput, createNcOutput, exportNcOutputsCsv } from "@/lib/data/actions"
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
import type { NcOutputListItem } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const PATH = "/app/salidas-no-conformes"

export function ExportNcOutputsCsvButton() {
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => {
      try { downloadCsv(`salidas-no-conformes-${todayIsoDate()}.csv`, await exportNcOutputsCsv()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })}><DownloadIcon /> Exportar CSV</Button>
  )
}

export function NewNcOutputSheet({ processes }: { processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [processId, setProcessId] = useState("")
  const [detectedDate, setDetectedDate] = useState(todayIsoDate())
  const [identification, setIdentification] = useState("")

  function submit() {
    if (description.trim().length < 3) { toast.error("Describe la salida no conforme."); return }
    start(async () => {
      const r = await createNcOutput({
        description, processId: processId || null, detectedDate, identification: identification.trim() || undefined,
      })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      router.push(`${PATH}/${r.data.code}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nueva salida</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva salida no conforme</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="snc-desc">Descripción</Label>
            <Textarea id="snc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="p. ej. Lote L-22 fuera de tolerancia" />
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
          <div className={field}><Label htmlFor="snc-date">Fecha de detección</Label>
            <Input id="snc-date" type="date" value={detectedDate} onChange={(e) => setDetectedDate(e.target.value)} className="w-48" />
          </div>
          <div className={field}><Label htmlFor="snc-id">Identificación (lote / cantidad / referencia, opcional)</Label>
            <Input id="snc-id" value={identification} onChange={(e) => setIdentification(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function NcOutputRowMenu({ item }: { item: NcOutputListItem }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const href = `${PATH}/${item.code}`
  const open = item.status === "abierto" || item.status === "tratado"

  function anular() {
    if (!confirm("La salida se anulará. ¿Continuar?")) return
    start(async () => {
      const r = await cancelOutput(item.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Salida anulada."); router.refresh()
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
        <DropdownMenuItem asChild className="min-h-9 text-body">
          <Link href={href}><ExternalLinkIcon aria-hidden="true" /> Ver ficha</Link>
        </DropdownMenuItem>
        {open && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-9 text-body" onSelect={anular}><BanIcon aria-hidden="true" /> Anular</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
