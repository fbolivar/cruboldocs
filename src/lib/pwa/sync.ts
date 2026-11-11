"use client"

import { submitNewSubmission } from "@/lib/data/actions"
import { listQueue, patchQueue, removeFromQueue } from "@/lib/pwa/queue"

/** Envía las respuestas en cola llamando a la misma server action que el envío en línea.
 *  La validación la hace el servidor; una falla deja el ítem en estado "error" para corregir. */
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { sent: 0, failed: 0 }
  const items = await listQueue()
  let sent = 0
  let failed = 0
  for (const it of items) {
    try {
      const r = await submitNewSubmission(it.formId, it.values)
      if (r.ok) {
        await removeFromQueue(it.id)
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
