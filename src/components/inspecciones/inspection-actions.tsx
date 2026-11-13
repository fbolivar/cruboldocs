"use client"

import { FileWarningIcon, PackageXIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { generateNcFromInspection, generateNcOutputFromInspection } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"

/** Acciones de rechazo: generar NC o salida no conforme (spec §3, ADR-117). */
export function RejectedActions({ inspectionId }: { inspectionId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function run(kind: "nc" | "salida") {
    start(async () => {
      const r = kind === "nc"
        ? await generateNcFromInspection(inspectionId)
        : await generateNcOutputFromInspection(inspectionId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(kind === "nc" ? `No conformidad ${r.data.code} generada.` : `Salida no conforme ${r.data.code} generada.`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => run("nc")} loading={pending}><FileWarningIcon /> Generar NC</Button>
      <Button variant="outline" onClick={() => run("salida")} loading={pending}><PackageXIcon /> Generar salida no conforme</Button>
    </div>
  )
}
