"use client"

import { BellIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createChatNotifier, discardChatNotifier, testChatNotifier, updateChatNotifier } from "@/lib/data/actions"
import { CHAT_EVENT_LABELS, CHAT_EVENTS, type ChatEvent } from "@/lib/chat/events"
import { Badge, Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { ChatNotifierView } from "@/lib/types"

type EditState = { provider: "slack" | "teams"; name: string; url: string; events: ChatEvent[]; enabled: boolean }

function NotifierSheet({ notifier, trigger }: { notifier: ChatNotifierView | null; trigger: React.ReactNode }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [st, setSt] = useState<EditState>({
    provider: notifier?.provider ?? "slack", name: notifier?.name ?? "", url: "",
    events: (notifier?.events ?? []) as ChatEvent[], enabled: notifier?.enabled ?? true,
  })

  const field = "flex flex-col gap-1.5"
  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

  function toggleEvent(e: ChatEvent) {
    setSt((s) => ({ ...s, events: s.events.includes(e) ? s.events.filter((x) => x !== e) : [...s.events, e] }))
  }

  function save() {
    if (st.name.trim().length < 2) { toast.error("Ponle un nombre al canal."); return }
    if (st.url.trim().length < 8) { toast.error("Pega la URL del incoming webhook."); return }
    if (st.events.length === 0) { toast.error("Elige al menos un evento."); return }
    start(async () => {
      const r = notifier
        ? await updateChatNotifier({ id: notifier.id, url: st.url.trim(), name: st.name.trim(), events: st.events, enabled: st.enabled })
        : await createChatNotifier({ provider: st.provider, url: st.url.trim(), name: st.name.trim(), events: st.events })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(notifier ? "Canal actualizado." : "Canal agregado.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{notifier ? "Editar canal" : "Agregar canal"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {!notifier && (
            <div className={field}>
              <Label htmlFor="nf-provider">Proveedor</Label>
              <select id="nf-provider" value={st.provider} onChange={(e) => setSt((s) => ({ ...s, provider: e.target.value as "slack" | "teams" }))} className={select}>
                <option value="slack">Slack</option>
                <option value="teams">Microsoft Teams</option>
              </select>
            </div>
          )}
          <div className={field}>
            <Label htmlFor="nf-name">Nombre</Label>
            <Input id="nf-name" value={st.name} maxLength={80} onChange={(e) => setSt((s) => ({ ...s, name: e.target.value }))} placeholder="Canal Calidad" />
          </div>
          <div className={field}>
            <Label htmlFor="nf-url">URL del incoming webhook</Label>
            <Input id="nf-url" value={st.url} maxLength={500} onChange={(e) => setSt((s) => ({ ...s, url: e.target.value }))} placeholder={notifier ? "Pega la URL de nuevo para actualizarla" : "https://hooks.slack.com/…"} aria-describedby="nf-url-hint" />
            <p id="nf-url-hint" className="text-caption text-texto-sec">Solo URLs de Slack (hooks.slack.com) o Teams (…webhook.office.com). El aviso lleva solo el código y el título, sin datos del cliente.</p>
          </div>
          <div className={field}>
            <Label>Eventos</Label>
            {CHAT_EVENTS.map((e) => (
              <label key={e} className="flex items-center gap-2 text-body">
                <input type="checkbox" checked={st.events.includes(e)} onChange={() => toggleEvent(e)} className="size-4 accent-acento" />
                {CHAT_EVENT_LABELS[e]}
              </label>
            ))}
          </div>
          {notifier && (
            <label className="flex items-center gap-2 text-body">
              <input type="checkbox" checked={st.enabled} onChange={(e) => setSt((s) => ({ ...s, enabled: e.target.checked }))} className="size-4 accent-acento" />
              Activo
            </label>
          )}
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>{notifier ? "Guardar" : "Agregar canal"}</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function NotifiersManager({ notifiers }: { notifiers: ChatNotifierView[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function test(id: string) {
    start(async () => {
      const r = await testChatNotifier(id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Mensaje de prueba enviado.")
    })
  }
  function remove(id: string) {
    start(async () => {
      const r = await discardChatNotifier(id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Canal eliminado.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-small text-texto-sec">Publica avisos del SGC en Slack o Teams. El aviso va sin datos del cliente.</p>
        <NotifierSheet notifier={null} trigger={<Button><PlusIcon /> Agregar canal</Button>} />
      </div>
      {notifiers.length === 0 ? (
        <EmptyState icon={BellIcon} title="Aún no hay canales" description="Agrega el primero para recibir avisos en Slack o Teams." />
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {notifiers.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-texto">{n.name}</span>
                  <Chip className="capitalize">{n.provider}</Chip>
                  <Badge tone={n.enabled ? "exito" : "neutro"}>{n.enabled ? "Activo" : "Inactivo"}</Badge>
                </div>
                <p className="text-caption text-texto-sec">{n.events.map((e) => CHAT_EVENT_LABELS[e as ChatEvent] ?? e).join(" · ") || "sin eventos"} · {n.maskedUrl}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" loading={pending} onClick={() => test(n.id)}><SendIcon /> Probar</Button>
                <NotifierSheet notifier={n} trigger={<Button variant="outline" size="sm">Editar</Button>} />
                <Button variant="ghost" size="icon-sm" aria-label="Eliminar canal" loading={pending} onClick={() => remove(n.id)}><Trash2Icon /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
