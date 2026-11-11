"use client"

import { CheckCircle2Icon, LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { issueSupplierSelfAssessment, markSelfAssessmentReviewed } from "@/lib/data/actions"
import { CopyLinkField } from "@/components/portal/copy-link-field"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import type { SupplierSelfAssessmentView } from "@/lib/types"

type Props = {
  supplierId: string
  token: string | null
  assessments: SupplierSelfAssessmentView[]
  canManage: boolean
  baseUrl: string
}

function scoreTone(score: number) {
  if (score >= 80) return "text-exito-texto"
  if (score >= 60) return "text-advertencia-texto"
  return "text-error-texto"
}

export function SupplierSelfAssessmentPanel({ supplierId, token, assessments, canManage, baseUrl }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [current, setCurrent] = useState(token)
  const [origin] = useState(() => baseUrl || (typeof window !== "undefined" ? window.location.origin : ""))

  const link = current ? `${origin}/proveedor/${current}` : ""

  function issue() {
    start(async () => {
      const r = await issueSupplierSelfAssessment(supplierId)
      if (!r.ok) { toast.error(r.error); return }
      setCurrent(r.data.token)
      toast.success("Enlace generado.")
      router.refresh()
    })
  }

  function review(id: string) {
    start(async () => {
      const r = await markSelfAssessmentReviewed(id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Autoevaluación marcada como revisada.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-col gap-2">
          <p className="text-small text-texto-sec">
            Genera un enlace para que el proveedor complete su autoevaluación sin cuenta. La respuesta queda para tu revisión; no cambia la evaluación oficial.
          </p>
          {current && link ? (
            <>
              <CopyLinkField link={link} />
              <Button variant="ghost" size="sm" className="self-start" loading={pending} onClick={issue}>
                Regenerar enlace
              </Button>
            </>
          ) : (
            <Button variant="outline" className="self-start" loading={pending} onClick={issue}>
              <LinkIcon /> Enviar autoevaluación
            </Button>
          )}
        </div>
      )}

      {assessments.length === 0 ? (
        <EmptyState icon={CheckCircle2Icon} title="Sin autoevaluaciones aún" description="Cuando el proveedor responda, verás su puntaje aquí." />
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {assessments.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-body">
                  <span className={`font-display text-h3 tabular-nums ${scoreTone(a.score)}`}>{a.score}</span>
                  <span className="text-texto-sec"> / 100 · {formatDate(a.submittedAt)}</span>
                </p>
                {a.comment && <p className="mt-1 text-small text-texto-sec">{a.comment}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.status === "revisada" ? (
                  <span className="inline-flex items-center gap-1 text-small text-exito-texto"><CheckCircle2Icon className="size-4" /> Revisada</span>
                ) : canManage ? (
                  <Button variant="outline" size="sm" loading={pending} onClick={() => review(a.id)}>Marcar revisada</Button>
                ) : (
                  <span className="text-small text-texto-sec">Recibida</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
