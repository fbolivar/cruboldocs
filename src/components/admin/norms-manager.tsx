"use client"

import { PlusIcon, ScaleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { DataCard, ResultCount, TabToolbar } from "@/components/admin/tab-layout"
import { setNormActive, upsertNorm } from "@/lib/data/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import type { Norm } from "@/lib/types"

const ISO = [
  { code: "9001", name: "ISO 9001 — Gestión de la calidad" },
  { code: "14001", name: "ISO 14001 — Gestión ambiental" },
  { code: "45001", name: "ISO 45001 — Seguridad y salud en el trabajo" },
]

export function NormsManager({ norms }: { norms: Norm[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const existing = new Set(norms.map((n) => n.code))

  function activate(code: string, name: string) {
    start(async () => {
      const r = await upsertNorm({ code, name })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Norma ${code} activada.`); router.refresh()
    })
  }
  function toggle(n: Norm) {
    start(async () => {
      const r = await setNormActive(n.id, !n.isActive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(n.isActive ? "Norma desactivada." : "Norma activada."); router.refresh()
    })
  }

  const isoButtons = ISO.filter((i) => !existing.has(i.code)).map((i) => (
    <Button key={i.code} variant="outline" size="sm" onClick={() => activate(i.code, i.name)} loading={pending}>
      + ISO {i.code}
    </Button>
  ))

  return (
    <div className="flex flex-col gap-4">
      <TabToolbar action={<div className="flex flex-wrap gap-2">{isoButtons}<NewNormSheet /></div>}>
        <ResultCount count={norms.length} singular="norma" plural="normas" />
      </TabToolbar>

      {norms.length === 0 ? (
        <Card>
          <EmptyState icon={ScaleIcon} title="Aún no has activado normas." description="Activa 9001/14001/45001 o crea una norma propia (BASC, NTC 6001…)." />
        </Card>
      ) : (
        <DataCard
          className="max-w-3xl"
          table={
            <Table>
              <caption className="sr-only">Normas de la organización</caption>
              <THead><tr><Th className="w-24">Código</Th><Th>Nombre</Th><Th className="text-right">Etiquetados</Th><Th className="w-28 text-right">Estado</Th></tr></THead>
              <tbody>
                {norms.map((n) => (
                  <Tr key={n.id} className="hover:bg-superficie-alt">
                    <Td className="font-mono">{n.code}</Td>
                    <Td className="font-medium">{n.name}</Td>
                    <Td className="text-right tabular-nums">{n.taggedCount}</Td>
                    <Td className="py-1 text-right">
                      <button onClick={() => toggle(n)} disabled={pending} className="inline-flex items-center gap-2">
                        <Badge tone={n.isActive ? "exito" : "neutro"}>{n.isActive ? "Activa" : "Inactiva"}</Badge>
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          }
          cards={norms.map((n) => (
            <li key={n.id} className="flex items-center gap-2 py-2 pr-1 pl-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium"><span className="font-mono text-texto-sec">{n.code}</span> {n.name}</span>
                <span className="text-small text-texto-sec">{n.taggedCount} etiquetados</span>
              </div>
              <button onClick={() => toggle(n)} disabled={pending}><Badge tone={n.isActive ? "exito" : "neutro"}>{n.isActive ? "Activa" : "Inactiva"}</Badge></button>
            </li>
          ))}
        />
      )}
    </div>
  )
}

function NewNormSheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  function submit() {
    if (code.trim().length < 1 || name.trim().length < 1) { toast.error("Indica código y nombre."); return }
    start(async () => {
      const r = await upsertNorm({ code, name })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Norma creada."); setOpen(false); setCode(""); setName(""); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Nueva norma</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva norma</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5"><Label htmlFor="nm-code">Código</Label>
            <Input id="nm-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="p. ej. BASC" />
          </div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="nm-name">Nombre</Label>
            <Input id="nm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Norma BASC v6" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear norma</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
