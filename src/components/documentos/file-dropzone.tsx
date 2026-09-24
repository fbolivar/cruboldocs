"use client"

import { CircleCheckIcon, FileUpIcon, XIcon } from "lucide-react"
import { useRef, useState } from "react"

import type { AttachedFile } from "@/components/documentos/use-register-form"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/format"
import { MAX_FILE_BYTES } from "@/lib/domain/documents"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  id: string
  label: string
  /** Extensiones aceptadas, p. ej. [".pdf"]. */
  extensions: string[]
  formatsText: string
  typeError: string
  sizeError: string
  value: AttachedFile | null
  onChange: (fn: (prev: AttachedFile | null) => AttachedFile | null) => void
  onTouched: () => void
  error: string | null
}

/**
 * Zona de arrastre para un archivo obligatorio: valida tipo y tamaño (25 MB) y permite quitarlo.
 * La subida a Storage ocurre al enviar el formulario.
 */
export function FileDropzone({ id, label, extensions, formatsText, typeError, sizeError, value, onChange, onTouched, error }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const shownError = localError ?? error
  const errorId = `${id}-error`

  const accept = (file: File | undefined) => {
    onTouched()
    if (!file) return
    const lower = file.name.toLocaleLowerCase("es")
    if (!extensions.some((ext) => lower.endsWith(ext))) return setLocalError(typeError)
    if (file.size > MAX_FILE_BYTES) return setLocalError(sizeError)
    setLocalError(null)
    onChange(() => ({ name: file.name, size: file.size, file }))
  }

  return (
    <div id={id} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
      <span id={`${id}-label`} className="text-label">
        {label} <span className="text-texto-sec">(obligatorio)</span>
      </span>
      {value ? (
        <div className="flex flex-col gap-2 rounded-md border border-borde px-3 py-2.5">
          <div className="flex items-center gap-2 text-small">
            <CircleCheckIcon className="size-4 shrink-0 text-exito" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              {value.name} · <span className="text-texto-sec">{formatFileSize(value.size)}</span>
            </span>
            <Button variant="ghost" size="icon" aria-label={`Quitar ${value.name}`} onClick={() => onChange(() => null)}>
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        // El clic en toda la zona es un atajo de ratón/táctil; el botón "selecciónalo" es el control accesible.
        <div
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("button")) inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-4 text-center text-small text-texto-sec transition-colors duration-150",
            dragging ? "border-acento bg-acento-suave" : shownError ? "border-error" : "border-borde-fuerte"
          )}
        >
          <FileUpIcon className="size-5 text-acento" aria-hidden="true" />
          <p>
            <span className="font-medium text-texto">Arrastra el archivo aquí</span> o{" "}
            <Button variant="link" className="h-auto px-0 text-small md:h-auto" onClick={() => inputRef.current?.click()} aria-describedby={shownError ? errorId : `${id}-formatos`} aria-label={`Seleccionar ${label}`}>
              selecciónalo
            </Button>
          </p>
          <p id={`${id}-formatos`}>{formatsText} · máx. 25 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={extensions.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {shownError && (
        <p id={errorId} className="text-small text-error-texto">
          {shownError}
        </p>
      )}
    </div>
  )
}
