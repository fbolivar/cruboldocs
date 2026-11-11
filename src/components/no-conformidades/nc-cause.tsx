"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setNcCause } from "@/lib/data/actions"
import { AiDraftNote, SuggestWithAi } from "@/components/ia/suggest-with-ai"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { SearchIcon } from "lucide-react"

/** Análisis de causa raíz (texto libre). Editable por el gestor. */
export function NcCause({ ncId, ncCode, cause, canManage, aiEnabled = false }: { ncId: string; ncCode: string; cause: string | null; canManage: boolean; aiEnabled?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(cause ?? "")

  function save() {
    if (value.trim().length < 5) {
      toast.error("Describe la causa raíz.")
      return
    }
    start(async () => {
      const r = await setNcCause(ncId, value)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Causa guardada.")
      setEditing(false)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} placeholder="¿Por qué ocurrió? (causa raíz)" />
        {aiEnabled && (
          <div className="flex flex-col gap-1">
            <SuggestWithAi task="nc_causa" code={ncCode} onText={setValue} label="Sugerir causa con IA" />
            <AiDraftNote />
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} loading={pending}>Guardar causa</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue(cause ?? "") }}>Cancelar</Button>
        </div>
      </div>
    )
  }

  if (!cause) {
    return (
      <EmptyState
        icon={SearchIcon}
        title="Aún sin análisis de causa"
        description={canManage ? undefined : "Un líder del SIG registrará la causa."}
        action={canManage ? <Button size="sm" onClick={() => setEditing(true)}>Analizar causa</Button> : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body whitespace-pre-line">{cause}</p>
      {canManage && (
        <div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
        </div>
      )}
    </div>
  )
}
