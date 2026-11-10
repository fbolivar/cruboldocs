"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { NcStatus, NcVerification } from "@/lib/types"

/**
 * Verificación de eficacia. Solo disponible en estado `verificacion` (todas las acciones hechas).
 * "No eficaz" reabre la NC; "Eficaz" la cierra. Envío se conecta en backend (ADR-008).
 */
export function NcVerifyPanel({
  status,
  verification,
  canManage,
}: {
  status: NcStatus
  verification: NcVerification | null
  canManage: boolean
}) {
  const [effective, setEffective] = useState<"si" | "no" | "">("")
  const [notes, setNotes] = useState("")

  if (status === "cerrada" && verification) {
    return (
      <p className="text-small">
        <span className="font-medium text-exito-texto">Eficaz.</span> Verificada por {verification.verifiedByName} el{" "}
        {formatDate(verification.verifiedAt)}.{verification.notes ? ` ${verification.notes}` : ""}
      </p>
    )
  }

  if (status !== "verificacion") {
    return (
      <p className="text-small text-texto-sec">
        La verificación de eficacia se habilita cuando todas las acciones del plan estén hechas.
      </p>
    )
  }

  if (!canManage) {
    return <p className="text-small text-texto-sec">Un líder del SIG verificará la eficacia antes de cerrar.</p>
  }

  function submit() {
    if (!effective) {
      toast.error("Indica si las acciones fueron eficaces.")
      return
    }
    // TODO(backend): server action verify_nc.
    if (effective === "si") toast.success("No conformidad cerrada.")
    else toast.success("Reabierta para nuevas acciones.")
    setEffective("")
    setNotes("")
  }

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup value={effective} onValueChange={(v) => setEffective(v as "si" | "no")} className="flex flex-col gap-2">
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value="si" /> Eficaz — el problema no se repite
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value="no" /> No eficaz — reabrir con nuevas acciones
        </Label>
      </RadioGroup>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nc-verif-notes">Notas</Label>
        <Textarea id="nc-verif-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cómo se verificó la eficacia" />
      </div>
      <div>
        <Button onClick={submit}>{effective === "no" ? "Reabrir" : "Verificar y cerrar"}</Button>
      </div>
    </div>
  )
}
