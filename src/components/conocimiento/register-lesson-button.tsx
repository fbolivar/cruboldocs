"use client"

import { LightbulbIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { createLessonFromAudit, createLessonFromNc } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"

/** Crea un artículo de lecciones aprendidas desde una NC o auditoría. */
export function RegisterLessonButton({ ncId, auditId }: { ncId?: string; auditId?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("Se creará un artículo de conocimiento (lección aprendida) ligado a este registro. ¿Continuar?")) return
    start(async () => {
      const r = ncId ? await createLessonFromNc(ncId) : auditId ? await createLessonFromAudit(auditId) : null
      if (!r) return
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Lección ${r.data.code} registrada.`)
      router.push(`/app/conocimiento/${r.data.code}`)
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><LightbulbIcon /> Registrar lección</Button>
}
