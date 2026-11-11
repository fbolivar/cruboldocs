"use client"

import { CheckIcon, ClipboardCopyIcon, SparklesIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type Option = { id: string; name: string }
type CopilotEntity = "nc" | "riesgo"

type TextBlock = { type: "text"; text: string }
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string }
type Block = TextBlock | ToolUseBlock | ToolResultBlock | { type: string; [k: string]: unknown }
type Msg = { role: "user" | "assistant"; content: string | Block[] }

const TOOL_LABEL: Record<string, string> = {
  sugerir_causa_nc: "Guardar causa raíz",
  proponer_accion_capa: "Agregar acción CAPA",
  sugerir_control: "Agregar control",
  sugerir_valoracion: "Registrar valoración",
}

function textOf(content: string | Block[]): string {
  if (typeof content === "string") return content
  return content.filter((b): b is TextBlock => b.type === "text").map((b) => b.text).join("\n").trim()
}
function toolUsesOf(m: Msg): ToolUseBlock[] {
  if (typeof m.content === "string") return []
  return m.content.filter((b): b is ToolUseBlock => b.type === "tool_use")
}

export function CopilotButton({
  entity,
  recordRef,
  intent,
  label = "Sugerir con Crubol-Agent",
  positions = [],
  monthlyLimit = null,
}: {
  entity: CopilotEntity
  /** Referencia del registro: código para NC, id para riesgo. */
  recordRef: string
  /** Mensaje inicial que siembra el copiloto (p. ej. "Sugiere la causa raíz de esta no conformidad"). */
  intent: string
  label?: string
  positions?: Option[]
  monthlyLimit?: number | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const started = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const posName = (id: unknown) => positions.find((p) => p.id === id)?.name ?? "(cargo)"

  function describe(b: ToolUseBlock): string {
    const i = b.input
    if (b.name === "sugerir_causa_nc") return String(i.cause ?? "")
    if (b.name === "proponer_accion_capa") return `[${i.type}] ${i.description} · ${posName(i.responsiblePositionId)} · ${i.dueDate}`
    if (b.name === "sugerir_control") return `[${i.type}/${i.frequency}] ${i.description} · ${posName(i.responsiblePositionId)}`
    if (b.name === "sugerir_valoracion") return `${i.kind} · P${i.probability} × I${i.impact}`
    return JSON.stringify(i)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [history, busy])

  const last = history[history.length - 1]
  const lastUses = last?.role === "assistant" ? toolUsesOf(last) : []

  async function callChat(next: Msg[]) {
    setBusy(true)
    try {
      const res = await fetch("/api/agente/copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, ref: recordRef, messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "El copiloto no pudo responder.")
        return
      }
      setHistory((h) => [...h, { role: "assistant", content: data.content as Block[] }])
      if (typeof data.remaining === "number") setRemaining(data.remaining)
    } catch {
      toast.error("No se pudo contactar al copiloto.")
    } finally {
      setBusy(false)
    }
  }

  // El sembrado va en el handler de apertura (no en un efecto): al abrir, un único primer turno.
  function onOpenChange(o: boolean) {
    setOpen(o)
    if (o && !started.current) {
      started.current = true
      const next: Msg[] = [{ role: "user", content: intent }]
      setHistory(next)
      void callChat(next)
    } else if (!o) {
      started.current = false
      setHistory([])
      setResolved({})
    }
  }

  async function settle(uses: ToolUseBlock[], map: Record<string, string>) {
    if (!uses.every((u) => u.id in map)) return
    const results: ToolResultBlock[] = uses.map((u) => ({ type: "tool_result", tool_use_id: u.id, content: map[u.id] }))
    const next: Msg[] = [...history, { role: "user", content: results }]
    setHistory(next)
    await callChat(next)
  }

  async function confirm(b: ToolUseBlock) {
    setBusy(true)
    try {
      const res = await fetch("/api/agente/copiloto/ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, ref: recordRef, tool: b.name, input: b.input }),
      })
      const data = await res.json()
      const ok = res.ok && data?.ok
      if (ok) {
        toast.success(`${TOOL_LABEL[b.name] ?? b.name}: aplicado.`)
        router.refresh()
      } else {
        toast.error(data?.error ?? "No se pudo aplicar.")
      }
      const map = { ...resolved, [b.id]: ok ? "Aplicado ✓" : `No se aplicó: ${data?.error ?? "error"}.` }
      setResolved(map)
      await settle(lastUses, map)
    } catch {
      toast.error("No se pudo aplicar.")
      setBusy(false)
    }
  }

  async function discard(b: ToolUseBlock) {
    const map = { ...resolved, [b.id]: "Descartada; no se aplicó." }
    setResolved(map)
    await settle(lastUses, map)
  }

  async function copyCause(b: ToolUseBlock) {
    try {
      await navigator.clipboard.writeText(String(b.input.cause ?? ""))
      toast.success("Causa copiada; pégala en el campo para editarla.")
    } catch {
      toast.error("No se pudo copiar.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-label={label}>
        <SparklesIcon /> {label}
      </Button>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-acento" /> Crubol-Agent
          </SheetTitle>
          <SheetDescription>Propone y, si confirmas, aplica sobre este registro. Tú decides cada acción.</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {history.map((m, idx) => {
              const text = textOf(m.content)
              const uses = m.role === "assistant" ? toolUsesOf(m) : []
              const isResult = m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result")
              if (isResult) return null
              const isSeed = m.role === "user" && idx === 0
              return (
                <div key={idx} className="flex flex-col gap-2">
                  {text && !isSeed && (
                    <div className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-acento px-3 py-2 text-small text-superficie" : "mr-auto max-w-[85%] rounded-lg bg-superficie-alt px-3 py-2 text-small text-texto"}>
                      {text}
                    </div>
                  )}
                  {uses.map((u) => {
                    const done = resolved[u.id]
                    return (
                      <div key={u.id} className="mr-auto w-full max-w-[92%] rounded-lg border border-borde bg-superficie px-3 py-2.5">
                        <p className="text-overline text-texto-sec">PROPONE · {TOOL_LABEL[u.name] ?? u.name}</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-small font-medium text-texto">{describe(u)}</p>
                        {done ? (
                          <p className="mt-1.5 text-caption text-texto-sec">{done}</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => confirm(u)} disabled={busy}><CheckIcon /> Confirmar</Button>
                            <Button size="sm" variant="outline" onClick={() => discard(u)} disabled={busy}><XIcon /> Cancelar</Button>
                            {u.name === "sugerir_causa_nc" && (
                              <Button size="sm" variant="ghost" onClick={() => copyCause(u)} disabled={busy}><ClipboardCopyIcon /> Copiar al campo</Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {busy && <p className="mr-auto text-caption text-texto-sec" aria-live="polite">Crubol-Agent está analizando este registro…</p>}
          </div>
        </div>

        <div className="border-t border-borde p-3">
          {remaining !== null && (
            <p className="mb-1 text-caption text-texto-sec">Acciones disponibles este mes: {remaining}{monthlyLimit ? ` de ${monthlyLimit}` : ""}.</p>
          )}
          <p className="text-caption text-texto-sec">El agente solo lee este registro y no envía datos personales del cliente.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
