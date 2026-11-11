"use client"

import { SparklesIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { suggestWithAi } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import type { ContentTask } from "@/lib/agente/content"

/** Botón "Sugerir con IA": genera un borrador y lo entrega por callback (cae en un campo editable). */
export function SuggestWithAi({
  task, code, getPrompt, label = "Sugerir con IA", onText, size = "sm",
}: {
  task: ContentTask
  code?: string
  /** Para documento_borrador: devuelve el prompt del usuario en el momento del clic. */
  getPrompt?: () => string
  label?: string
  onText: (text: string) => void
  size?: "sm" | "default"
}) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      const r = await suggestWithAi({ task, code, prompt: getPrompt?.() })
      if (!r.ok) { toast.error(r.error); return }
      onText(r.data.text)
      toast.success(`Borrador generado. Te quedan ${r.data.remaining} usos de IA este mes.`)
    })
  }
  return (
    <Button type="button" variant="outline" size={size} loading={pending} onClick={run}>
      <SparklesIcon /> {label}
    </Button>
  )
}

/** Rótulo discreto para un texto que vino de la IA (debe revisarse antes de guardar). */
export function AiDraftNote() {
  return (
    <p className="flex items-center gap-1 text-caption text-texto-sec">
      <SparklesIcon className="size-3.5 text-acento" /> Borrador generado por IA — revísalo antes de guardar.
    </p>
  )
}
