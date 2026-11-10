"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AuditStatus } from "@/lib/types"

/** Inicia la auditoría (planificada) o la cierra con conclusiones (en ejecución). Stubs; backend. */
export function AuditCloseForm({
  auditId,
  status,
  conclusions,
  canManage,
}: {
  auditId: string
  status: AuditStatus
  conclusions: string | null
  canManage: boolean
}) {
  const [text, setText] = useState("")

  function start() {
    // TODO(backend): server action startAudit.
    toast.success("Auditoría iniciada.")
    void auditId
  }
  function close() {
    if (text.trim().length < 5) {
      toast.error("Escribe las conclusiones.")
      return
    }
    // TODO(backend): server action closeAudit.
    toast.success("Auditoría cerrada.")
  }

  if (status === "cerrada") {
    return <p className="text-body whitespace-pre-line">{conclusions || "Sin conclusiones registradas."}</p>
  }
  if (status === "cancelada") {
    return <p className="text-small text-texto-sec">Auditoría cancelada.</p>
  }
  if (!canManage) {
    return (
      <p className="text-small text-texto-sec">
        {status === "planificada" ? "El Líder SIG iniciará la auditoría." : "El Líder SIG la cerrará con las conclusiones."}
      </p>
    )
  }
  if (status === "planificada") {
    return (
      <div>
        <Button onClick={start}>Iniciar auditoría</Button>
      </div>
    )
  }
  // en_ejecucion
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="aud-concl">Conclusiones</Label>
      <Textarea id="aud-concl" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Conclusiones de la auditoría" />
      <div>
        <Button onClick={close}>Cerrar auditoría</Button>
      </div>
    </div>
  )
}
