"use client"

import { InboxIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setPublicPqrsPortal } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { CopyLinkField } from "@/components/portal/copy-link-field"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { PqrsPortalView } from "@/lib/types"

export function PublicPqrsSheet({ portal, baseUrl }: { portal: PqrsPortalView; baseUrl: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [state, setState] = useState(portal)
  const [origin] = useState(() => baseUrl || (typeof window !== "undefined" ? window.location.origin : ""))

  const link = state.token ? `${origin}/pqrs/${state.token}` : ""

  function apply(enabled: boolean, regenerate = false) {
    start(async () => {
      const r = await setPublicPqrsPortal({ enabled, regenerate })
      if (!r.ok) { toast.error(r.error); return }
      setState({ enabled, token: r.data.token || state.token })
      toast.success(regenerate ? "Enlace regenerado." : enabled ? "Buzón activado." : "Buzón desactivado.")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><InboxIcon /> Buzón público</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Buzón público de PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <p className="text-small text-texto-sec">
            Comparte este enlace para que tus clientes radiquen PQRS sin cuenta. Las PQRS entran por el canal web.
          </p>

          <div className="flex items-center justify-between rounded-md border border-borde bg-fondo p-3">
            <div>
              <p className="text-body font-medium text-texto">{state.enabled ? "Activado" : "Desactivado"}</p>
              <p className="text-caption text-texto-sec">{state.enabled ? "El enlace recibe PQRS." : "El enlace no recibe PQRS."}</p>
            </div>
            <Button variant={state.enabled ? "outline" : "default"} loading={pending} onClick={() => apply(!state.enabled)}>
              {state.enabled ? "Desactivar" : "Activar"}
            </Button>
          </div>

          {state.enabled && link && (
            <div className="flex flex-col gap-2">
              <CopyLinkField link={link} />
              <Button variant="ghost" className="self-start" loading={pending} onClick={() => apply(true, true)}>
                Regenerar enlace
              </Button>
              <p className="text-caption text-texto-sec">Al regenerar, el enlace anterior deja de funcionar.</p>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-borde"><Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
