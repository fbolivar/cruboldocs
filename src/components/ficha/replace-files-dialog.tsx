"use client"

import { type FormEvent, useId, useState } from "react"

import { FichaDialogContent, FichaDialogFooter } from "@/components/ficha/ficha-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MAX_FILE_BYTES } from "@/lib/domain/documents"

interface ReplaceFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionNo: number
  onDone: (sourceFileName: string) => void
}

/** Reemplazo de PDF y fuente de un borrador. Solo local: aún no existe la acción de servidor. */
export function ReplaceFilesDialog({ open, onOpenChange, versionNo, onDone }: ReplaceFilesDialogProps) {
  const id = useId()
  const [pdf, setPdf] = useState<File | null>(null)
  const [source, setSource] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function change(next: boolean) {
    if (!next) {
      setPdf(null)
      setSource(null)
      setError(null)
    }
    onOpenChange(next)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!pdf || !source) return setError("Adjunta el PDF y el archivo fuente.")
    if (pdf.size > MAX_FILE_BYTES || source.size > MAX_FILE_BYTES) return setError("Cada archivo puede pesar hasta 25 MB.")
    onDone(source.name)
    change(false)
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
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Reemplazar archivos</Button>
          </FichaDialogFooter>
        </form>
      </FichaDialogContent>
    </Dialog>
  )
}
