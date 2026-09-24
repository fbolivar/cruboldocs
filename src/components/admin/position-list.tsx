import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"
import type * as React from "react"

import { Card } from "@/components/ui/card"
import type { Position } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PositionListProps {
  positions: Position[]
  selectedId: string
  action: React.ReactNode
  className?: string
}

export function PositionList({ positions, selectedId, action, className }: PositionListProps) {
  return (
    <Card className={cn("flex w-full flex-col overflow-hidden md:w-80 md:shrink-0", className)}>
      <div className="flex flex-col gap-3 border-b border-borde p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-h3">Cargos</h2>
          <span className="text-small text-texto-sec">{positions.length}</span>
        </div>
        {action}
      </div>
      <nav aria-label="Cargos">
        <ul className="divide-y divide-borde">
          {positions.map((p) => {
            const current = p.id === selectedId
            return (
              <li key={p.id}>
                <Link
                  href={`/app/admin?tab=cargos&cargo=${p.id}`}
                  scroll={false}
                  aria-current={current ? "true" : undefined}
                  className={cn("flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-superficie-alt", current && "md:bg-acento-suave")}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("truncate", current && "md:font-medium md:text-acento")}>{p.name}</span>
                    <span className="truncate text-small text-texto-sec">
                      {p.processName ?? "Sin proceso"} · {p.roles.length} {p.roles.length === 1 ? "rol" : "roles"}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-texto-sec md:hidden" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </Card>
  )
}
