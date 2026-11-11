"use client"

import { prepareFormPhotos, submitNewSubmission } from "@/lib/data/actions"
import { deletePhotos, getPhoto, listQueue, patchQueue, removeFromQueue } from "@/lib/pwa/queue"
import { uploadToTicket } from "@/lib/data/upload"
import type { FieldValue } from "@/lib/types"

const isLocal = (t: unknown): t is string => typeof t === "string" && t.startsWith("local:")

/** Sube las fotos pendientes (local:<id>) a Storage y reemplaza los marcadores por su ruta
 *  temporal; devuelve los valores listos para enviar y los ids locales a borrar al terminar. */
async function resolvePhotos(
  formId: string, values: Record<string, FieldValue>,
): Promise<{ values: Record<string, FieldValue>; localIds: string[] }> {
  const out: Record<string, FieldValue> = {}
  const localIds: string[] = []
  for (const [key, v] of Object.entries(values)) {
    if (Array.isArray(v) && v.some(isLocal)) {
      const arr: string[] = []
      for (const el of v) {
        if (isLocal(el)) {
          const id = el.slice("local:".length)
          const ph = await getPhoto(id)
          if (!ph) throw new Error("Falta una foto pendiente en este dispositivo.")
          const r = await prepareFormPhotos(formId, [ph.ext])
          if (!r.ok) throw new Error(r.error)
          await uploadToTicket(r.data[0], new File([ph.blob], `foto.${ph.ext}`, { type: ph.blob.type || "image/jpeg" }))
          arr.push(r.data[0].path)
          localIds.push(id)
        } else {
          arr.push(el as string)
        }
      }
      out[key] = arr
    } else {
      out[key] = v
    }
  }
  return { values: out, localIds }
}

/** Envía las respuestas en cola llamando a la misma server action que el envío en línea.
 *  La validación la hace el servidor; una falla deja el ítem en estado "error" para corregir. */
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { sent: 0, failed: 0 }
  const items = await listQueue()
  let sent = 0
  let failed = 0
  for (const it of items) {
    try {
      const { values, localIds } = await resolvePhotos(it.formId, it.values)
      const r = await submitNewSubmission(it.formId, values)
      if (r.ok) {
        await removeFromQueue(it.id)
        await deletePhotos(localIds)
        sent++
      } else {
        await patchQueue(it.id, { status: "error", error: r.error })
        failed++
      }
    } catch {
      // Sin red u otro fallo transitorio: se deja en cola para reintentar luego.
      failed++
    }
  }
  return { sent, failed }
}
