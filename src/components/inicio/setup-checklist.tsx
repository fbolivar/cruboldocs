import { CheckIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SetupProgress } from "@/lib/types"
import { cn } from "@/lib/utils"

// `agentHelps`: pasos que Crubol-Agent puede armar por conversación (procesos y cargos). Si el
// agente está activo, se ofrece como atajo además del flujo manual.
const STEPS: { key: keyof SetupProgress; title: string; description: string; action: string; tab: string; agentHelps?: boolean }[] = [
  { key: "hasProcesses", title: "Crear procesos", description: "Define el mapa de procesos de tu organización.", action: "Crear procesos", tab: "procesos", agentHelps: true },
  {
    key: "hasPositionsWithRoles",
    title: "Crear cargos y asignar roles",
    description: "Los permisos se otorgan al cargo, no a la persona.",
    action: "Crear cargos",
    tab: "cargos",
    agentHelps: true,
  },
  { key: "hasInvitedUsers", title: "Invitar usuarios", description: "Envía la invitación y asigna un cargo a cada persona.", action: "Invitar usuarios", tab: "usuarios" },
]

const BAR_WIDTH = ["w-0", "w-1/3", "w-2/3", "w-full"] as const

/** Primer uso del Admin: 3 pasos de configuración con progreso x/3. */
export function SetupChecklist({ progress, agentEnabled = false }: { progress: SetupProgress; agentEnabled?: boolean }) {
  const done = STEPS.filter((s) => progress[s.key]).length
  const nextIndex = STEPS.findIndex((s) => !progress[s.key])
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Configura tu organización</CardTitle>
          <p className="text-small text-texto-sec">Completa estos pasos para que tu equipo empiece a trabajar.</p>
        </div>
        <div className="flex w-full items-center gap-3 md:w-56">
          <div
            role="progressbar"
            aria-label="Progreso de configuración"
            aria-valuemin={0}
            aria-valuemax={STEPS.length}
            aria-valuenow={done}
            aria-valuetext={`${done} de ${STEPS.length} pasos`}
            className="h-2 flex-1 overflow-hidden rounded-sm bg-superficie-alt"
          >
            <div className={cn("h-full rounded-sm bg-acento", BAR_WIDTH[done])} />
          </div>
          <span className="text-label tabular-nums">{`${done}/${STEPS.length}`}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2 md:pt-2">
        <ol className="flex flex-col">
          {STEPS.map((step, i) => {
            const complete = progress[step.key]
            return (
              <li key={step.key} className="flex flex-wrap items-center gap-3 border-t border-borde py-4 first:border-t-0 md:flex-nowrap md:gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-label",
                    complete ? "bg-exito-suave text-exito-texto" : "bg-superficie-alt text-texto"
                  )}
                >
                  {complete ? <CheckIcon className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {step.title}
                    {complete && <span className="ml-2 text-small font-normal text-exito-texto">Completado</span>}
                  </p>
                  <p className="text-small text-texto-sec">{step.description}</p>
                  {!complete && step.agentHelps && agentEnabled && (
                    <Link
                      href="/app/admin?tab=procesos"
                      className="mt-1 inline-flex items-center gap-1 text-small font-medium text-acento underline-offset-4 hover:underline"
                    >
                      <SparklesIcon className="size-3.5" />
                      O pídeselo a Crubol-Agent
                    </Link>
                  )}
                </div>
                {!complete && (
                  <Button asChild size="sm" variant={i === nextIndex ? "default" : "outline"} className="w-full md:w-auto">
                    <Link href={`/app/admin?tab=${step.tab}`}>{step.action}</Link>
                  </Button>
                )}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
