"use client"

import { PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormSheet } from "@/components/admin/form-sheet"
import { MENU_ITEM_CLASS, RowMenuTrigger } from "@/components/admin/row-menu-trigger"
import { codeError } from "@/components/admin/validation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { saveDocumentType } from "@/lib/data/actions"
import type { DocumentType } from "@/lib/types"

type Errors = Partial<Record<"code" | "name", string>>

/** Crear o editar un tipo de documento. `docType` ausente = crear (con su botón primario). */
export function DocTypeSheet({ docType, compact = false }: { docType?: DocumentType; compact?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(docType?.code ?? "")
  const [name, setName] = useState(docType?.name ?? "")
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()

  function submit() {
    const next: Errors = {
      code: codeError(code.trim()) ?? undefined,
      name: name.trim() ? undefined : "Escribe el nombre del tipo, p. ej. Procedimiento.",
    }
    setErrors(next)
    if (next.code || next.name) return
    startTransition(async () => {
      const res = await saveDocumentType({ id: docType?.id, code: code.trim(), name: name.trim() })
      if (!res.ok) return setErrors({ code: res.error })
      toast.success(docType ? `Tipo ${name.trim()} actualizado` : `Tipo ${name.trim()} creado`)
      if (!docType) {
        setCode("")
        setName("")
      }
      setOpen(false)
      router.refresh()
    })
  }

  const label = docType ? `Editar ${docType.name}` : "Crear tipo"
  return (
    <>
      {!docType ? (
        <Button className="w-full md:w-auto" onClick={() => setOpen(true)}>
          <PlusIcon aria-hidden="true" />
          Crear tipo
        </Button>
      ) : compact ? (
        <DropdownMenu>
          <RowMenuTrigger label={`Acciones para ${docType.name}`} />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => setOpen(true)}>
              <PencilIcon aria-hidden="true" />
              Editar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="ghost" size="icon" aria-label={label} onClick={() => setOpen(true)}>
          <PencilIcon aria-hidden="true" />
        </Button>
      )}
      <FormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setErrors({})
        }}
        title={docType ? `Editar tipo ${docType.code}` : "Crear tipo de documento"}
        description="El código encabeza el código de cada documento (p. ej. PR-GC-003)."
        submitLabel={docType ? "Guardar cambios" : "Crear tipo"}
        pending={pending}
        onSubmit={submit}
      >
        <Field id={`tipo-codigo-${docType?.id ?? "nuevo"}`} label="Código" required error={errors.code} help={errors.code ? undefined : "2 o 3 letras mayúsculas."}>
          {(aria) => <Input {...aria} className="font-mono uppercase" maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PR" />}
        </Field>
        <Field id={`tipo-nombre-${docType?.id ?? "nuevo"}`} label="Nombre" required error={errors.name}>
          {(aria) => <Input {...aria} value={name} onChange={(e) => setName(e.target.value)} placeholder="Procedimiento" />}
        </Field>
      </FormSheet>
    </>
  )
}
