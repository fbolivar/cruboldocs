import { PenLineIcon } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { HexIcon } from "@/components/ui/hex-icon"
import { formatDateTime, shortHash } from "@/lib/format"
import type { Signature } from "@/lib/types"

const ACTION_LABEL: Record<Signature["action"], string> = {
  revision: "Firmó la revisión",
  aprobacion: "Firmó la aprobación",
}

/** Firmas de la versión en orden cronológico. Solo lectura. */
export function SignatureTimeline({ signatures }: { signatures: Signature[] }) {
  if (signatures.length === 0) {
    return <EmptyState icon={PenLineIcon} title="Aún no hay firmas." className="py-8" />
  }
  const ordered = [...signatures].sort((a, b) => a.signedAt.localeCompare(b.signedAt))
  return (
    <ol className="flex flex-col">
      {ordered.map((s) => (
        <li key={s.id} className="flex gap-3 border-t border-borde py-4 first:border-t-0 first:pt-0">
          <HexIcon icon={PenLineIcon} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p>
              <span className="font-medium">{s.signer.fullName}</span>{" "}
              <span className="text-texto-sec">· {s.signer.positionName}</span>
            </p>
            <p className="font-medium">{ACTION_LABEL[s.action]}</p>
            <p className="text-body-lg">«{s.meaning}»</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-small text-texto-sec">
              <span>{formatDateTime(s.signedAt)}</span>
              {s.ip && <span>IP {s.ip}</span>}
              <span>
                Firma <span className="font-mono">{shortHash(s.signatureHash)}</span>
              </span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
