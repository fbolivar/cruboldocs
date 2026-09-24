"use client"

import { type FormEvent, useId, useState } from "react"

import { FichaDialogContent, FichaDialogFooter } from "@/components/ficha/ficha-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { attachVersionFiles, prepareVersionUpload } from "@/lib/data/actions"
import { uploadToTicket } from "@/lib/data/upload"
import { MAX_FILE_BYTES } from "@/lib/domain/documents"

interface ReplaceFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  versionNo: number
  onDone: (sourceFileName: string) => void
}

/** Reemplazo de PDF y fuente de un borrador: sube a Storage y el servidor verifica y calcula el hash. */
export function ReplaceFilesDialog({ open, onOpenChange, documentId, versionNo, onDone }: ReplaceFilesDialogProps) {
  const id = useId()
  const [pdf, setPdf] = useState<File | null>(null)
  const [source, setSource] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  function change(next: boolean) {
    if (sending) return
    if (!next) {
      setPdf(null)
      setSource(null)
      setError(null)
    }
    onOpenChange(next)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pdf || !source) return setError("Adjunta el PDF y el archivo fuente.")
    if (pdf.size > MAX_FILE_BYTES || source.size > MAX_FILE_BYTES) return setError("Cada archivo puede pesar hasta 25 MB.")
    setError(null)
    setSending(true)
    try {
      const tickets = await prepareVersionUpload(documentId, versionNo, pdf.name, source.name)
      if (!tickets.ok) return setError(tickets.error)
      await Promise.all([uploadToTicket(tickets.data.pdf, pdf), uploadToTicket(tickets.data.source, source)])
      const res = await attachVersionFiles({
        documentId,
        versionNo,
        pdfPath: tickets.data.pdf.path,
        sourcePath: tickets.data.source.path,
        sourceFileName: source.name,
        submit: false,
      })
      if (!res.ok) return setError(res.error)
      setPdf(null)
      setSource(null)
      onDone(res.data.sourceFileName)
      onOpenChange(false)
    } catch {
      setError("No pudimos subir los archivos. Revisa tu conexión e inténtalo de nuevo.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <FichaDialogContent
        title={`Reemplazar archivos de la versión ${versionNo}`}
        description="Sube el PDF que se publicará y el archivo fuente editable."
      >
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
          <Field id={`${id}-pdf`} label="PDF" help="Hasta 25 MB." required>
            {(aria) => <Input {...aria} type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />}
          </Field>
          <Field id={`${id}-fuente`} label="Archivo fuente" help="Word, Excel o PowerPoint. Hasta 25 MB." error={error} required>
            {(aria) => (
              <Input {...aria} type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(e) => setSource(e.target.files?.[0] ?? null)} />
            )}
          </Field>
          <FichaDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={sending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={sending} disabled={sending}>
              Reemplazar archivos
            </Button>
          </FichaDialogFooter>
        </form>
      </FichaDialogContent>
    </Dialog>
  )
}
