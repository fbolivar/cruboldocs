"use client"

import { CheckIcon, CopyIcon, SparklesIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { suggestWithAi } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { ContentTask } from "@/lib/agente/content"

/** Botón "Resumen con IA" → diálogo con el texto generado y Copiar (auditoría / acta). */
export function AiSummaryDialog({ task, code, title = "Resumen con IA" }: { task: ContentTask; code: string; title?: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)

  function run() {
    setOpen(true)
    setText("")
    start(async () => {
      const r = await suggestWithAi({ task, code })
      if (!r.ok) { toast.error(r.error); setOpen(false); return }
      setText(r.data.text)
      toast.success(`Resumen generado. Te quedan ${r.data.remaining} usos de IA este mes.`)
    })
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* selección manual */ }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" onClick={run}><SparklesIcon /> {title}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Resumen con IA</DialogTitle></DialogHeader>
        <p className="flex items-center gap-1 text-caption text-texto-sec"><SparklesIcon className="size-3.5 text-acento" /> Borrador generado por IA — revísalo antes de usarlo.</p>
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-borde bg-fondo p-3 text-small text-texto">
          {pending ? "Generando…" : text || "—"}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={!text} onClick={copy}>
            {copied ? <CheckIcon className="text-exito-texto" /> : <CopyIcon />} Copiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
