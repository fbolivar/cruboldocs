"use client"

import { PlusIcon } from "lucide-react"

import { useRegisterDrawer } from "@/components/documentos/use-register-drawer"
import { Button } from "@/components/ui/button"

/** Abre el panel "Registrar documento" (el panel vive en las acciones del encabezado). */
export function RegisterButton() {
  const { setOpen } = useRegisterDrawer()
  return (
    <Button onClick={() => setOpen(true)}>
      <PlusIcon aria-hidden="true" />
      Registrar documento
    </Button>
  )
}
