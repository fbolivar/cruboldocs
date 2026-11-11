"use client"

import { clearPhotos, clearQueue } from "@/lib/pwa/queue"

/** Al cerrar sesión: borra la cola local y las fotos pendientes, y pide al service worker limpiar
 *  las cachés (privacidad en dispositivos compartidos, ADR-058/072). Nunca falla el cierre de sesión. */
export async function clearOfflineData(): Promise<void> {
  try {
    await clearQueue()
    await clearPhotos()
  } catch {
    /* noop */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHES" })
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* noop */
  }
}
