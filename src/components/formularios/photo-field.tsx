"use client"
/* eslint-disable @next/next/no-img-element -- blobs y URLs firmadas efímeras; next/image no las optimiza */

import { CameraIcon, Loader2Icon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getFormPhotoUrls, prepareFormPhotos } from "@/lib/data/actions"
import { compressImage } from "@/lib/pwa/photos"
import { deletePhotos, getPhoto, putPhoto } from "@/lib/pwa/queue"
import { uploadToTicket } from "@/lib/data/upload"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { FormFieldView } from "@/lib/types"

const isLocal = (t: string) => t.startsWith("local:")
const isFinalPath = (t: string) => !isLocal(t) && t.split("/").length === 3

export function PhotoField({
  field, value, onChange, readOnly, templateId,
}: {
  field: FormFieldView
  value: string[]
  onChange?: (v: string[]) => void
  readOnly?: boolean
  templateId?: string
}) {
  const tokens = Array.isArray(value) ? value : []
  const max = Math.min(Math.max(field.config?.max ?? 3, 1), 10)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(0)
  const [zoom, setZoom] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carga las miniaturas: rutas finales → URL firmada; locales → blob de IndexedDB.
  useEffect(() => {
    let alive = true
    const finals = tokens.filter((t) => isFinalPath(t) && !previews[t])
    const locals = tokens.filter((t) => isLocal(t) && !previews[t])
    ;(async () => {
      const add: Record<string, string> = {}
      if (finals.length) {
        const urls = await getFormPhotoUrls(finals)
        Object.assign(add, urls)
      }
      for (const t of locals) {
        const ph = await getPhoto(t.slice("local:".length))
        if (ph) add[t] = URL.createObjectURL(ph.blob)
      }
      if (alive && Object.keys(add).length) setPreviews((p) => ({ ...p, ...add }))
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!templateId || files.length === 0) return
    const room = max - tokens.length
    const batch = files.slice(0, Math.max(0, room))
    if (files.length > room) toast.error(`Solo puedes agregar ${max} fotos.`)
    for (const file of batch) {
      setBusy((b) => b + 1)
      try {
        const { blob, ext } = await compressImage(file)
        const preview = URL.createObjectURL(blob)
        if (typeof navigator !== "undefined" && navigator.onLine) {
          const r = await prepareFormPhotos(templateId, [ext])
          if (!r.ok) { toast.error(r.error); URL.revokeObjectURL(preview); continue }
          await uploadToTicket(r.data[0], new File([blob], `foto.${ext}`, { type: blob.type || "image/jpeg" }))
          const token = r.data[0].path
          setPreviews((p) => ({ ...p, [token]: preview }))
          onChange?.([...tokens, token])
        } else {
          const localId = crypto.randomUUID()
          await putPhoto(localId, blob, ext)
          const token = `local:${localId}`
          setPreviews((p) => ({ ...p, [token]: preview }))
          onChange?.([...tokens, token])
        }
      } catch {
        toast.error("No pudimos procesar la imagen.")
      } finally {
        setBusy((b) => b - 1)
      }
    }
  }

  function remove(token: string) {
    onChange?.(tokens.filter((t) => t !== token))
    if (isLocal(token)) deletePhotos([token.slice("local:".length)])
    setPreviews((p) => { const { [token]: _gone, ...rest } = p; return rest })
  }

  if (readOnly) {
    if (tokens.length === 0) return <p className="text-body text-texto-sec">Sin fotos</p>
    return (
      <>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tokens.map((t, i) => (
            <button key={t} type="button" onClick={() => previews[t] && setZoom(previews[t])}
              className="aspect-square overflow-hidden rounded-md border border-borde bg-superficie-alt">
              {previews[t]
                ? <img src={previews[t]} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                : <span className="flex size-full items-center justify-center text-caption text-texto-sec">Foto {i + 1}</span>}
            </button>
          ))}
        </div>
        <PhotoZoom url={zoom} onClose={() => setZoom(null)} />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {tokens.map((t, i) => (
          <div key={t} className="relative aspect-square overflow-hidden rounded-md border border-borde bg-superficie-alt">
            {previews[t]
              ? <img src={previews[t]} alt={`Foto ${i + 1}`} className="size-full object-cover" />
              : <span className="flex size-full items-center justify-center text-caption text-texto-sec">Foto {i + 1}</span>}
            {isLocal(t) && <span className="absolute bottom-0 inset-x-0 bg-advertencia-suave py-0.5 text-center text-caption text-advertencia-texto">Pendiente</span>}
            <button type="button" onClick={() => remove(t)} aria-label={`Quitar foto ${i + 1}`}
              className="absolute right-1 top-1 rounded-full bg-texto/70 p-0.5 text-superficie hover:bg-texto">
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {tokens.length < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-borde-fuerte text-caption text-texto-sec hover:bg-superficie-alt">
            {busy > 0 ? <Loader2Icon className="size-5 animate-spin" aria-hidden="true" /> : <CameraIcon className="size-5" aria-hidden="true" />}
            <span>{busy > 0 ? "Subiendo…" : "Tomar / Subir"}</span>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={onPick} />
          </label>
        )}
      </div>
      <p className="text-caption text-texto-sec">Hasta {max} fotos{tokens.some(isLocal) ? " · hay fotos pendientes de subir (se enviarán al reconectar)" : ""}</p>
    </div>
  )
}

function PhotoZoom({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">Foto</DialogTitle>
        {url && <img src={url} alt="Foto ampliada" className="max-h-[80vh] w-full rounded object-contain" />}
      </DialogContent>
    </Dialog>
  )
}
