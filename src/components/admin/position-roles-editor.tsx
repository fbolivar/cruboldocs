"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OptionSelect, type Option } from "@/components/admin/option-select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { savePosition } from "@/lib/data/actions"
import { ROLE_LABELS } from "@/lib/domain/documents"
import type { Position, PositionRole, Role } from "@/lib/types"

const ALL = "todos"
const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))
const same = (a: PositionRole, b: PositionRole) => a.role === b.role && a.processId === b.processId

/** Tabla de roles del cargo (Rol, Alcance) con agregar/quitar y guardado explícito. */
export function PositionRolesEditor({ position, processes }: { position: Position; processes: Option[] }) {
  const router = useRouter()
  const [roles, setRoles] = useState<PositionRole[]>(position.roles)
  const [newRole, setNewRole] = useState("")
  const [newScope, setNewScope] = useState(ALL)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const scopeOptions = [{ value: ALL, label: "Todos los procesos" }, ...processes]
  const scopeLabel = (id: string | null) => (id ? (processes.find((p) => p.value === id)?.label ?? "Proceso") : "Todos los procesos")
  const dirty = roles.length !== position.roles.length || roles.some((r, i) => !same(r, position.roles[i]))

  function add() {
    if (!newRole) return setError("Elige el rol que quieres agregar.")
    const role: PositionRole = { role: newRole as Role, processId: newScope === ALL ? null : newScope }
    if (roles.some((r) => same(r, role))) return setError("Este rol ya está asignado con ese alcance.")
    setRoles([...roles, role])
    setNewRole("")
    setError(null)
  }

  function save() {
    startTransition(async () => {
      const res = await savePosition({ id: position.id, name: position.name, processId: position.processId, roles })
      if (!res.ok) return void toast.error(res.error)
      toast.success(`Roles de ${position.name} guardados`)
      router.refresh()
    })
  }

  const removeButton = (r: PositionRole) => (
    <Button variant="ghost" size="icon" aria-label={`Quitar ${ROLE_LABELS[r.role]} (${scopeLabel(r.processId)})`} onClick={() => setRoles(roles.filter((x) => !same(x, r)))}>
      <Trash2Icon aria-hidden="true" />
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      {roles.length === 0 ? (
        <p className="rounded-sm bg-superficie-alt px-4 py-3 text-small text-texto-sec">Este cargo no tiene roles: sus personas solo verán lo que se les distribuya.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-borde">
          <Table className="hidden md:table">
            <caption className="sr-only">Roles asignados a {position.name}</caption>
            <THead>
              <tr>
                <Th>Rol</Th>
                <Th>Alcance</Th>
                <Th className="w-14"><span className="sr-only">Quitar</span></Th>
              </tr>
            </THead>
            <tbody>
              {roles.map((r) => (
                <Tr key={`${r.role}-${r.processId}`}>
                  <Td className="font-medium">{ROLE_LABELS[r.role]}</Td>
                  <Td className="text-texto-sec">{scopeLabel(r.processId)}</Td>
                  <Td className="py-1 text-right">{removeButton(r)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <ul className="divide-y divide-borde md:hidden">
            {roles.map((r) => (
              <li key={`${r.role}-${r.processId}`} className="flex items-center gap-2 py-1 pr-1 pl-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{ROLE_LABELS[r.role]}</span>
                  <span className="text-small text-texto-sec">{scopeLabel(r.processId)}</span>
                </span>
                {removeButton(r)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label">Agregar rol</legend>
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nuevo-rol" className="sr-only">Rol</Label>
            <OptionSelect aria={{ id: "nuevo-rol", "aria-invalid": error ? true : undefined, "aria-describedby": error ? "nuevo-rol-error" : undefined }} options={ROLE_OPTIONS} value={newRole} onChange={setNewRole} placeholder="Rol" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nuevo-alcance" className="sr-only">Alcance</Label>
            <OptionSelect aria={{ id: "nuevo-alcance" }} options={scopeOptions} value={newScope} onChange={setNewScope} />
          </div>
          <Button type="button" variant="outline" onClick={add}>
            <PlusIcon aria-hidden="true" />
            Agregar
          </Button>
        </div>
        {error && <p id="nuevo-rol-error" className="text-small text-error-texto">{error}</p>}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-borde pt-4 md:flex-row md:justify-end">
        <Button variant="outline" disabled={!dirty || pending} onClick={() => setRoles(position.roles)}>
          Descartar cambios
        </Button>
        <Button disabled={!dirty} loading={pending} onClick={save}>
          Guardar roles
        </Button>
      </div>
    </div>
  )
}
