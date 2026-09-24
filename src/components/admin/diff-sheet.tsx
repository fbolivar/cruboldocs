"use client"

import { ArrowRightIcon } from "lucide-react"

import { auditActionLabel } from "@/components/admin/labels"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDateTime } from "@/lib/format"
import type { AuditEntry } from "@/lib/types"

/** Panel lateral con el diff de un evento (antes → después, en mono). Solo lectura. */
export function DiffSheet({ entry, className }: { entry: AuditEntry; className?: string }) {
  const fields = Object.entries(entry.diff)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={`Ver cambios de ${entry.entityLabel} (${formatDateTime(entry.at)})`}>
          Ver cambios
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0">
        <SheetHeader className="border-b border-borde px-4 py-4 pr-12 md:px-6">
          <SheetTitle className="font-display text-h3">Cambios registrados</SheetTitle>
          <SheetDescription className="text-small text-texto-sec">
            {auditActionLabel(entry.action)} · {entry.actorName} · {formatDateTime(entry.at)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-6 md:px-6">
          <p className="text-small">
            <span className="text-texto-sec">{entry.entityType}:</span> <span className="font-mono">{entry.entityLabel}</span>
          </p>
          {fields.length === 0 ? (
            <p className="text-small text-texto-sec">Este evento no modificó campos.</p>
          ) : (
            <dl className="flex flex-col gap-3">
              {fields.map(([field, { before, after }]) => (
                <div key={field} className="flex flex-col gap-1.5 rounded-sm border border-borde p-3">
                  <dt className="text-caption text-texto-sec uppercase">{field}</dt>
                  <dd className="flex flex-wrap items-center gap-2 font-mono text-small">
                    <span className="rounded-sm bg-error-suave px-1.5 text-error-texto">
                      <span className="sr-only">Antes: </span>
                      {before ?? "—"}
                    </span>
                    <ArrowRightIcon className="size-4 text-texto-sec" aria-hidden="true" />
                    <span className="rounded-sm bg-exito-suave px-1.5 text-exito-texto">
                      <span className="sr-only">Después: </span>
                      {after ?? "—"}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
