"use client"

import { CheckIcon, CopyIcon, SparklesIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { suggestWithAi } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/** Borrador de documento con IA: prompt → texto editable + Copiar (para pegar en el editor). */
export function AiDocumentDraftDialog() {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [prompt, setPrompt] = useState("")
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)

  function run() {
    if (prompt.trim().length < 5) { toast.error("Describe qué documento necesitas."); return }
    start(async () => {
      const r = await suggestWithAi({ task: "documento_borrador", prompt: prompt.trim() })
      if (!r.ok) { toast.error(r.error); return }
      setText(r.data.text)
      toast.success(`Borrador generado. Te quedan ${r.data.remaining} usos de IA este mes.`)
    })
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* selección manual */ }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><SparklesIcon /> Borrador con IA</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Borrador de documento con IA</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-doc-prompt">¿Qué documento necesitas?</Label>
          <Textarea id="ai-doc-prompt" rows={2} maxLength={600} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej.: procedimiento de control de documentos para una pyme de servicios" />
        </div>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-caption text-texto-sec"><SparklesIcon className="size-3.5 text-acento" /> Borrador — revísalo y adáptalo antes de subirlo.</p>
          <Button type="button" size="sm" loading={pending} onClick={run}>Generar</Button>
        </div>
        {text && (
          <>
            <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-small" />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={copy}>
                {copied ? <CheckIcon className="text-exito-texto" /> : <CopyIcon />} Copiar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
