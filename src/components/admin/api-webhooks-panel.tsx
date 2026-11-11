"use client"

import { CopyIcon, PlusIcon, WebhookIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createWebhookEndpoint, revokeWebhookEndpoint } from "@/lib/data/actions"
import { Badge, Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/format"
import type { WebhookEndpointView, WebhookEvent } from "@/lib/types"

const EVENTS: { event: WebhookEvent; label: string }[] = [
  { event: "nonconformity.created", label: "No conformidad creada" },
  { event: "indicator.measurement.recorded", label: "Medición registrada" },
  { event: "pqrs.created", label: "PQRS creada" },
  { event: "nonconforming_output.created", label: "Salida no conforme creada" },
]
const eventLabel = (e: WebhookEvent) => EVENTS.find((x) => x.event === e)?.label ?? e
const field = "flex flex-col gap-1.5"

export function WebhooksPanel({ endpoints }: { endpoints: WebhookEndpointView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-h3 text-texto">Webhooks</h2>
          <p className="text-small text-texto-sec">Recibe un POST firmado cuando ocurren eventos. Guarda el secreto al crearlo.</p>
        </div>
        <NewWebhookSheet />
      </div>
      {endpoints.length === 0 ? (
        <Card><EmptyState icon={WebhookIcon} title="Sin webhooks." description="Crea el primero para notificar a tu sistema." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {endpoints.map((e) => (
              <li key={e.id} className={`flex flex-wrap items-start justify-between gap-2 p-4 ${e.revokedAt ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-all font-mono text-caption text-texto">{e.url}</span>
                    {e.revokedAt && <Badge tone="neutro">Revocado</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {e.events.map((ev) => <Chip key={ev}>{eventLabel(ev)}</Chip>)}
                  </div>
                  <p className="mt-1 text-caption text-texto-sec">
                    creado {formatDate(e.createdAt)} · {e.deliveries} entregas{e.failed > 0 ? ` · ${e.failed} fallidas` : ""}
                  </p>
                </div>
                {!e.revokedAt && <RevokeButton id={e.id} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function RevokeButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("El webhook dejará de recibir. ¿Continuar?")) return
    start(async () => {
      const r = await revokeWebhookEndpoint(id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Webhook revocado."); router.refresh()
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}>Revocar</Button>
}

function NewWebhookSheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [secret, setSecret] = useState<string | null>(null)

  function toggle(e: WebhookEvent) {
    setEvents((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))
  }
  function submit() {
    if (!/^https:\/\//.test(url.trim())) { toast.error("La URL debe empezar por https://"); return }
    if (events.length === 0) { toast.error("Elige al menos un evento."); return }
    start(async () => {
      const r = await createWebhookEndpoint({ url, events })
      if (!r.ok) { toast.error(r.error); return }
      setSecret(r.data.secret)
      router.refresh()
    })
  }
  function close(v: boolean) {
    setOpen(v)
    if (!v) { setUrl(""); setEvents([]); setSecret(null) }
  }
  function copy() {
    if (secret) navigator.clipboard?.writeText(secret).then(() => toast.success("Secreto copiado."), () => toast.error("No se pudo copiar."))
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Nuevo endpoint</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo webhook</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {secret ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md bg-advertencia-suave p-3 text-small text-advertencia-texto">
                Guarda este secreto: firma cada webhook (HMAC-SHA256) y <strong>no se vuelve a mostrar</strong>.
              </div>
              <div className="flex items-center gap-2 rounded-md border border-borde bg-superficie-alt p-2">
                <code className="min-w-0 flex-1 break-all font-mono text-caption text-texto" aria-label="Secreto del webhook">{secret}</code>
                <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar secreto"><CopyIcon /></Button>
              </div>
            </div>
          ) : (
            <>
              <div className={field}><Label htmlFor="wh-url">URL (https://)</Label>
                <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tu-sistema.com/hooks/crubol" />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-small font-medium text-texto">Eventos</legend>
                {EVENTS.map((e) => (
                  <label key={e.event} className="flex items-center gap-2 text-body text-texto">
                    <input type="checkbox" checked={events.includes(e.event)} onChange={() => toggle(e.event)} className="accent-acento" />
                    {e.label}
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>
        <SheetFooter className="border-t border-borde">
          {secret ? <Button onClick={() => close(false)}>Listo</Button> : <Button onClick={submit} loading={pending}>Crear</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
