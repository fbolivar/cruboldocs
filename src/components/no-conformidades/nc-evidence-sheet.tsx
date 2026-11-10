"use client"

import { PaperclipIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { addNcEvidence, prepareNcEvidenceUpload } from "@/lib/data/actions"
import { uploadToTicket } from "@/lib/data/upload"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const MAX_BYTES = 25 * 1024 * 1024

/** Adjunta la evidencia de una acción: sube el archivo a una URL firmada y la registra (server-only). */
export function NcEvidenceSheet({ ncId, actionId }: { ncId: string; actionId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  function submit() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error("Adjunta un archivo.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Cada archivo puede pesar hasta 25 MB.")
      return
    }
    start(async () => {
      const ticket = await prepareNcEvidenceUpload(ncId, actionId, file.name)
      if (!ticket.ok) {
        toast.error(ticket.error)
        return
      }
      try {
        await uploadToTicket(ticket.data, file)
      } catch {
        toast.error("No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.")
        return
      }
      const r = await addNcEvidence({ ncId, actionId, fileName: file.name, filePath: ticket.data.path, note })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Evidencia registrada.")
      setOpen(false)
      setNote("")
      if (fileRef.current) fileRef.current.value = ""
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost">
          <PaperclipIcon /> Evidencia
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Registrar evidencia</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nc-ev-file">Archivo (PDF, imagen, CSV u Office; máx. 25 MB)</Label>
            <input
              id="nc-ev-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.doc,.docx,.xls,.xlsx"
              className="text-small file:mr-3 file:rounded-md file:border-0 file:bg-superficie-alt file:px-3 file:py-1.5 file:text-texto"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nc-ev-note">Nota (opcional)</Label>
            <Textarea id="nc-ev-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué demuestra la evidencia" />
          </div>
          <p className="text-caption text-texto-sec">La evidencia no se puede editar después de registrarse.</p>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit} loading={pending}>Registrar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
