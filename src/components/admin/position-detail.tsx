import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"

import type { Option } from "@/components/admin/option-select"
import { PositionRolesEditor } from "@/components/admin/position-roles-editor"
import { Card } from "@/components/ui/card"
import type { Position } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PositionDetail({ position, processes, className }: { position: Position; processes: Option[]; className?: string }) {
  return (
    <Card className={cn("flex min-w-0 flex-1 flex-col", className)}>
      <div className="flex flex-col gap-1 border-b border-borde p-4 md:px-6 md:py-5">
        <Link
          href="/app/admin?tab=cargos"
          scroll={false}
          className="-ml-2 mb-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-sm px-2 text-label text-acento hover:underline md:hidden"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          Cargos
        </Link>
        <h2 className="font-display text-h2">{position.name}</h2>
        <p className="text-small text-texto-sec">Proceso: {position.processName ?? "sin proceso asignado"}</p>
      </div>

      <section aria-labelledby="roles-titulo" className="flex flex-col gap-3 p-4 md:px-6">
        <div>
          <h3 id="roles-titulo" className="font-display text-h3">
            Roles asignados
          </h3>
          <p className="text-small text-texto-sec">Las personas en este cargo heredan estos roles.</p>
        </div>
        <PositionRolesEditor key={position.id} position={position} processes={processes} />
      </section>

      <section aria-labelledby="personas-titulo" className="flex flex-col gap-3 border-t border-borde p-4 md:px-6">
        <h3 id="personas-titulo" className="font-display text-h3">
          Personas en este cargo
        </h3>
        {position.holders.length === 0 ? (
          <p className="text-small text-texto-sec">Nadie ocupa este cargo todavía. Asígnalo al invitar a un usuario.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {position.holders.map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-acento-suave text-small font-medium text-acento">
                  {h.fullName.charAt(0)}
                </span>
                {h.fullName}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
