"use client"

import { CloudOffIcon, DownloadIcon, RefreshCwIcon, UploadCloudIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { listQueue, removeFromQueue } from "@/lib/pwa/queue"
import { flushQueue } from "@/lib/pwa/sync"
import type { QueuedSubmission } from "@/lib/pwa/queue"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function PwaShell() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false)
  const [pending, setPending] = useState(0)
  const [installEvt, setInstallEvt] = useState<InstallPrompt | null>(null)
  const [waitingSw, setWaitingSw] = useState<ServiceWorker | null>(null)
  const syncing = useRef(false)

  async function refreshCount() {
    setPending((await listQueue()).length)
  }

  async function sync() {
    if (syncing.current || (typeof navigator !== "undefined" && !navigator.onLine)) return
    syncing.current = true
    try {
      const { sent } = await flushQueue()
      if (sent > 0) toast.success(`${sent} respuesta${sent > 1 ? "s" : ""} enviada${sent > 1 ? "s" : ""}.`)
    } finally {
      syncing.current = false
      await refreshCount()
    }
  }

  useEffect(() => {
    // Carga inicial de la cola (sistema externo: IndexedDB) y sincronización al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount()

    const onOnline = () => { setOffline(false); void sync() }
    const onOffline = () => setOffline(true)
    const onQueueChanged = () => void refreshCount()
    const onInstall = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallPrompt) }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    window.addEventListener("cruboldocs:queue-changed", onQueueChanged)
    window.addEventListener("beforeinstallprompt", onInstall)

    // Registro del service worker (solo en producción, para no interferir con el dev).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting) setWaitingSw(reg.waiting)
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing
          if (!sw) return
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) setWaitingSw(sw)
          })
        })
      }).catch(() => { /* el SW es una mejora; si falla, la app sigue igual */ })
    }
    // Intento de sincronización al montar (por si quedaron respuestas de una sesión previa).
    void sync()

    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("cruboldocs:queue-changed", onQueueChanged)
      window.removeEventListener("beforeinstallprompt", onInstall)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function install() {
    if (!installEvt) return
    await installEvt.prompt()
    setInstallEvt(null)
  }
  function applyUpdate() {
    waitingSw?.postMessage({ type: "SKIP_WAITING" })
    waitingSw?.addEventListener("statechange", () => { if (waitingSw.state === "activated") window.location.reload() })
    setWaitingSw(null)
    window.location.reload()
  }

  return (
    <>
      {offline && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-advertencia-suave px-4 py-1.5 text-caption text-advertencia-texto">
          <CloudOffIcon className="size-4" aria-hidden="true" />
          Sin conexión — puedes seguir diligenciando; tus respuestas se enviarán al reconectar.
        </div>
      )}
      <div className="fixed bottom-24 left-4 z-40 flex flex-col items-start gap-2 md:bottom-4">
        {installEvt && (
          <Button size="sm" variant="outline" onClick={install} className="shadow-md"><DownloadIcon /> Instalar app</Button>
        )}
        {waitingSw && (
          <Button size="sm" variant="outline" onClick={applyUpdate} className="shadow-md"><RefreshCwIcon /> Actualizar</Button>
        )}
        {pending > 0 && <PendingButton count={pending} onSync={sync} onChanged={refreshCount} />}
      </div>
    </>
  )
}

function PendingButton({ count, onSync, onChanged }: { count: number; onSync: () => Promise<void>; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<QueuedSubmission[]>([])
  const [busy, setBusy] = useState(false)

  async function load() { setItems(await listQueue()) }
  function onOpen(o: boolean) { setOpen(o); if (o) void load() }

  async function retry() {
    setBusy(true)
    try { await onSync() } finally { setBusy(false); await load(); await onChanged() }
  }
  async function discard(id: string) {
    await removeFromQueue(id); await load(); await onChanged()
  }

  return (
    <Sheet open={open} onOpenChange={onOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="shadow-md"><UploadCloudIcon /> Pendientes ({count})</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Respuestas por enviar</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <Button size="sm" onClick={retry} loading={busy}>Enviar ahora</Button>
          <ul className="divide-y divide-borde">
            {items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-body">{it.formCode} · {it.formTitle}</p>
                  <p className="text-caption text-texto-sec">Capturada {new Date(it.capturedAt).toLocaleString()}</p>
                  {it.status === "error" && <p className="text-caption text-error-texto">{it.error ?? "No se pudo enviar."}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={it.status === "error" ? "error" : "advertencia"} plain>{it.status === "error" ? "Error" : "En cola"}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => discard(it.id)}>Descartar</Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-caption text-texto-sec">Las respuestas se validan en el servidor al enviarse.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
