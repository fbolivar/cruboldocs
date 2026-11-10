"use client"

import { CheckIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

// Crubol-Agent: chat con confirmación humana. El agente solo PROPONE acciones de catálogo; cada
// propuesta se ejecuta únicamente si la persona la confirma. El backend (/api/agente) aplica el
// límite de uso y los permisos (RLS); aquí solo se orquesta la conversación.

type TextBlock = { type: "text"; text: string }
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string }
type Block = TextBlock | ToolUseBlock | ToolResultBlock | { type: string; [k: string]: unknown }
type Msg = { role: "user" | "assistant"; content: string | Block[] }

const TOOL_LABEL: Record<string, string> = {
  crear_proceso: "Crear proceso",
  crear_tipo_documento: "Crear tipo documental",
  crear_cargo: "Crear cargo",
}

function describe(b: ToolUseBlock): string {
  const i = b.input
  if (b.name === "crear_proceso") return `${i.code} · ${i.name} (${i.type})`
  if (b.name === "crear_tipo_documento") return `${i.code} · ${i.name}`
  if (b.name === "crear_cargo") {
    const roles = Array.isArray(i.roles) && i.roles.length ? ` — roles: ${(i.roles as string[]).join(", ")}` : ""
    return `${i.name}${roles}`
  }
  return JSON.stringify(i)
}

function textOf(content: string | Block[]): string {
  if (typeof content === "string") return content
  return content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()
}

function toolUsesOf(m: Msg): ToolUseBlock[] {
  if (typeof m.content === "string") return []
  return m.content.filter((b): b is ToolUseBlock => b.type === "tool_use")
}

export function AgentPanel({
  orgName,
  initialRemaining = null,
  monthlyLimit = null,
}: {
  orgName: string
  /** Acciones restantes del mes al abrir (uso ya conocido en el servidor). */
  initialRemaining?: number | null
  monthlyLimit?: number | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(initialRemaining)
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [history, busy])

  // Propuestas sin resolver del último turno del asistente (bloquean el envío de texto).
  const last = history[history.length - 1]
  const lastUses = last?.role === "assistant" ? toolUsesOf(last) : []
  const pending = lastUses.filter((u) => !(u.id in resolved))
  const hasPending = pending.length > 0

  async function callChat(next: Msg[]) {
    setBusy(true)
    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "El agente no pudo responder.")
        return
      }
      setHistory((h) => [...h, { role: "assistant", content: data.content as Block[] }])
      if (typeof data.remaining === "number") setRemaining(data.remaining)
    } catch {
      toast.error("No se pudo contactar al agente.")
    } finally {
      setBusy(false)
    }
  }

  async function sendText() {
    const text = input.trim()
    if (!text || busy || hasPending) return
    const next: Msg[] = [...history, { role: "user", content: text }]
    setHistory(next)
    setInput("")
    await callChat(next)
  }

  // Cuando todas las propuestas del turno quedan resueltas, se envían sus resultados para que el
  // agente continúe (confirme o siga). Las propuestas se resuelven una a una.
  async function settle(uses: ToolUseBlock[], map: Record<string, string>) {
    if (!uses.every((u) => u.id in map)) return
    const results: ToolResultBlock[] = uses.map((u) => ({
      type: "tool_result",
      tool_use_id: u.id,
      content: map[u.id],
    }))
    const next: Msg[] = [...history, { role: "user", content: results }]
    setHistory(next)
    // No se limpia `resolved`: cada propuesta tiene un id único, y mantenerlo deja la tarjeta en
    // estado "hecho". Una propuesta nueva trae otro id, así que vuelve a mostrar los botones.
    await callChat(next)
  }

  async function confirm(b: ToolUseBlock) {
    setBusy(true)
    try {
      const res = await fetch("/api/agente/ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: b.name, input: b.input }),
      })
      const data = await res.json()
      const ok = res.ok && data?.ok
      const label = `${TOOL_LABEL[b.name] ?? b.name} — ${describe(b)}`
      const note = ok
        ? `Éxito: la acción se ejecutó y se creó «${label}».`
        : `La acción falló: ${data?.error ?? "error"}.`
      if (ok) {
        toast.success(`Listo: ${label}.`)
        router.refresh() // refresca las listas del catálogo en Administración
      } else {
        toast.error(data?.error ?? "No se pudo ejecutar la acción.")
      }
      const map = { ...resolved, [b.id]: note }
      setResolved(map)
      await settle(lastUses, map)
    } catch {
      toast.error("No se pudo ejecutar la acción.")
      setBusy(false)
    }
  }

  async function discard(b: ToolUseBlock) {
    const map = { ...resolved, [b.id]: "La persona descartó esta acción; no se ejecutó." }
    setResolved(map)
    await settle(lastUses, map)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SparklesIcon />
          Crubol-Agent
        </Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-acento" />
            Crubol-Agent
          </SheetTitle>
          <SheetDescription>
            Te ayuda a crear procesos, tipos documentales y cargos en {orgName}. Propone cada acción y tú la
            confirmas antes de aplicarla.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-texto-sec">
              <SparklesIcon className="size-8 text-acento-suave" />
              <p className="text-small">
                Cuéntame qué necesitas. Por ejemplo:
                <br />
                «Crea el proceso de Gestión Ambiental» o «Necesito los cargos para revisar documentos».
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((m, idx) => {
                const text = textOf(m.content)
                const uses = m.role === "assistant" ? toolUsesOf(m) : []
                const isResultMsg =
                  m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result")
                if (isResultMsg) return null // los resultados de herramienta no se muestran como burbuja
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    {text && (
                      <div
                        className={
                          m.role === "user"
                            ? "ml-auto max-w-[85%] rounded-lg bg-acento px-3 py-2 text-small text-superficie"
                            : "mr-auto max-w-[85%] rounded-lg bg-superficie-alt px-3 py-2 text-small text-texto"
                        }
                      >
                        {text}
                      </div>
                    )}
                    {uses.map((u) => {
                      const done = resolved[u.id]
                      return (
                        <div
                          key={u.id}
                          className="mr-auto w-full max-w-[90%] rounded-lg border border-borde bg-superficie px-3 py-2.5"
                        >
                          <p className="text-overline text-texto-sec">{TOOL_LABEL[u.name] ?? u.name}</p>
                          <p className="mt-0.5 text-small font-medium text-texto">{describe(u)}</p>
                          {done ? (
                            <p className="mt-1.5 text-caption text-texto-sec">{done}</p>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={() => confirm(u)} disabled={busy}>
                                <CheckIcon />
                                Confirmar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => discard(u)} disabled={busy}>
                                <XIcon />
                                Descartar
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {busy && <p className="mr-auto text-caption text-texto-sec">Crubol-Agent está pensando…</p>}
            </div>
          )}
        </div>

        <div className="border-t border-borde p-3">
          {remaining !== null && (
            <p className="mb-2 text-caption text-texto-sec">
              Acciones disponibles este mes: {remaining}
              {monthlyLimit ? ` de ${monthlyLimit}` : ""}
            </p>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendText()
                }
              }}
              placeholder={hasPending ? "Confirma o descarta la propuesta para seguir…" : "Escribe tu mensaje…"}
              disabled={busy || hasPending}
              rows={2}
              className="min-h-11 flex-1 resize-none"
            />
            <Button size="icon" onClick={sendText} disabled={busy || hasPending || !input.trim()} aria-label="Enviar">
              <SendIcon />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
