import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CharacterizationView } from "@/components/procesos/characterize"
import { PROCESS_TYPE_LABELS } from "@/components/procesos/labels"
import { Page } from "@/components/shell/page"
import { Chip } from "@/components/ui/badge"
import { getCurrentUser, getProcessDetail } from "@/lib/data/queries"
import { canSeeProcessMap } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Proceso" }

const LINKS: { key: keyof import("@/lib/types").ProcessLinkedCounts; label: string; href: string }[] = [
  { key: "indicators", label: "Indicadores", href: "/app/indicadores" },
  { key: "risks", label: "Riesgos", href: "/app/riesgos" },
  { key: "documents", label: "Documentos", href: "/app/documentos" },
  { key: "objectives", label: "Objetivos", href: "/app/objetivos" },
  { key: "legal", label: "Requisitos legales", href: "/app/requisitos-legales" },
  { key: "parties", label: "Partes interesadas", href: "/app/contexto" },
  { key: "issues", label: "Cuestiones del contexto", href: "/app/contexto" },
]

export default async function ProcesoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeProcessMap(user)) notFound()

  const p = await getProcessDetail(decodeURIComponent(codigo))
  if (!p) notFound()

  return (
    <Page>
      <Link href="/app/procesos" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Procesos
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-small text-texto-sec">{p.code}</p>
            <h1 className="mt-0.5">{p.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{PROCESS_TYPE_LABELS[p.type]}</Chip>
            <span className="text-small text-texto-sec">Líder: {p.leaderName ?? "—"}</span>
          </div>
        </div>

        <CharacterizationView processId={p.id} characterization={p.characterization} canManage={p.canManage} />

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-texto">Ligado a este proceso</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {LINKS.map((l) => {
              const n = p.linked[l.key]
              return (
                <Link key={l.key} href={l.href}
                  className={`flex flex-col gap-1 rounded-md border border-borde p-3 hover:bg-superficie-alt ${n === 0 ? "opacity-60" : ""}`}>
                  <span className="font-display text-h3 tabular-nums text-texto">{n}</span>
                  <span className="text-caption text-texto-sec">{l.label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </Page>
  )
}
