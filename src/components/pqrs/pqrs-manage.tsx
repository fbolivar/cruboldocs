"use client"

import { ExternalLinkIcon, PencilIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { PqrsDetail } from "@/lib/types"

const stub = () => toast.success("Disponible cuando se conecte el backend.")
const isOpenStatus = (s: PqrsDetail["status"]) => s === "recibida" || s === "en_gestion" || s === "resuelta"

/** Acciones del encabezado: editar y anular (en estados abiertos). Stubs; backend. */
export function PqrsHeaderActions({ pqrs }: { pqrs: PqrsDetail }) {
  if (!isOpenStatus(pqrs.status)) return null
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={stub}><PencilIcon /> Editar</Button>
      <Button variant="outline" size="sm" onClick={stub}>Anular</Button>
    </div>
  )
}

/** Sección de gestión: asignar / cambiar estado. Stub; backend. */
export function PqrsManageActions({ pqrs }: { pqrs: PqrsDetail }) {
  if (!isOpenStatus(pqrs.status)) return null
  return <Button variant="outline" size="sm" onClick={stub}>Asignar / cambiar estado</Button>
}

/** Respuesta al cliente: muestra la registrada o permite registrarla (requerida para cerrar). */
export function PqrsResponse({ pqrs }: { pqrs: PqrsDetail }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const editable = isOpenStatus(pqrs.status) && pqrs.canManage

  function submit() {
    if (text.trim().length < 3) { toast.error("Escribe la respuesta al cliente."); return }
    stub(); setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {pqrs.response
        ? <p className="text-body whitespace-pre-wrap">{pqrs.response}</p>
        : <p className="text-small text-texto-sec">Aún sin respuesta registrada.</p>}
      {editable && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><div><Button size="sm">{pqrs.response ? "Editar respuesta" : "Registrar respuesta"}</Button></div></SheetTrigger>
          <SheetContent size="sm" className="gap-0 p-0">
            <SheetHeader className="border-b border-borde"><SheetTitle>Respuesta al cliente</SheetTitle></SheetHeader>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <Label htmlFor="pq-resp">Respuesta / resolución</Label>
              <Textarea id="pq-resp" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Qué se le responde al cliente" />
            </div>
            <SheetFooter className="border-t border-borde"><Button onClick={submit}>Guardar respuesta</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

/** Cierre con conformidad del cliente (exige respuesta registrada). Stub; backend. */
export function PqrsClose({ pqrs }: { pqrs: PqrsDetail }) {
  const [open, setOpen] = useState(false)
  const [satisfied, setSatisfied] = useState<"si" | "no">("si")
  if (!isOpenStatus(pqrs.status) || !pqrs.canManage) return null

  function submit() {
    if (!pqrs.response) { toast.error("Registra la respuesta antes de cerrar."); return }
    stub(); setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><div><Button>Cerrar PQRS</Button></div></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Cerrar PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 p-4">
          {!pqrs.response && <p className="rounded-md bg-advertencia-suave p-3 text-small text-advertencia-texto">Debes registrar la respuesta antes de cerrar.</p>}
          <Label>¿El cliente quedó conforme?</Label>
          <div className="flex gap-2">
            <Button variant={satisfied === "si" ? "default" : "outline"} size="sm" onClick={() => setSatisfied("si")}>Sí</Button>
            <Button variant={satisfied === "no" ? "default" : "outline"} size="sm" onClick={() => setSatisfied("no")}>No</Button>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} disabled={!pqrs.response}>Cerrar PQRS</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Generar NC desde un reclamo (idempotente) o enlace a la NC existente. Stub; backend. */
export function PqrsNcAction({ pqrs }: { pqrs: PqrsDetail }) {
  if (pqrs.type !== "reclamo") return null
  if (pqrs.nonconformityCode) {
    return (
      <Link href={`/app/no-conformidades/${pqrs.nonconformityCode}`} className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline">
        <ExternalLinkIcon className="size-3.5" /> {pqrs.nonconformityCode}
      </Link>
    )
  }
  if (!pqrs.canManage) return <p className="text-small text-texto-sec">Un reclamo puede generar una no conformidad.</p>
  return <Button size="sm" variant="outline" onClick={stub}>Generar no conformidad</Button>
}
