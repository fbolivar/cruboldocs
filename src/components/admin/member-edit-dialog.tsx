"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OptionSelect, type Option } from "@/components/admin/option-select"
import { fromDateInput, toDateInput, validUntilError } from "@/components/admin/validation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updateMembership } from "@/lib/data/actions"
import { todayIsoDate } from "@/lib/format"
import type { Member } from "@/lib/types"

interface MemberEditDialogProps {
  member: Member
  mode: "cargo" | "vigencia"
  positions: Option[]
  onClose: () => void
}

/** Cambiar el cargo o la vigencia de una membresía (diálogo corto de un campo). */
export function MemberEditDialog({ member, mode, positions, onClose }: MemberEditDialogProps) {
  const router = useRouter()
  const [positionId, setPositionId] = useState(member.positionId)
  const [validUntil, setValidUntil] = useState(toDateInput(member.validUntil))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const name = member.fullName ?? member.email

  function submit() {
    const err = mode === "vigencia" ? validUntilError(validUntil) : positionId ? null : "Elige el nuevo cargo."
    setError(err)
    if (err) return
    startTransition(async () => {
      const changes = mode === "cargo" ? { positionId } : { validUntil: fromDateInput(validUntil) }
      const res = await updateMembership(member.membershipId, changes)
      if (!res.ok) {
        setError(res.error)
        return
      }
      toast.success(mode === "cargo" ? `Cargo de ${name} actualizado` : `Vigencia de ${name} actualizada`)
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent className="p-6 sm:max-w-md">
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-h3">{mode === "cargo" ? "Cambiar cargo" : "Editar vigencia"}</DialogTitle>
            <DialogDescription className="text-body text-texto-sec">
              {mode === "cargo"
                ? `${name} tendrá los roles del nuevo cargo desde que guardes.`
                : `Fecha hasta la que ${name} tendrá acceso. Al vencer, pierde el acceso automáticamente.`}
            </DialogDescription>
          </DialogHeader>
          {mode === "cargo" ? (
            <Field id="edit-cargo" label="Cargo" required error={error}>
              {(aria) => <OptionSelect aria={aria} options={positions} value={positionId} onChange={setPositionId} placeholder="Elige un cargo" />}
            </Field>
          ) : (
            <Field id="edit-vigencia" label="Vigencia hasta" required error={error}>
              {(aria) => <Input {...aria} type="date" min={todayIsoDate()} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />}
            </Field>
          )}
          <DialogFooter className="flex-row justify-end gap-3">
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
