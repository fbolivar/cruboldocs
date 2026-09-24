"use client"

import { TriangleAlertIcon } from "lucide-react"
import type * as React from "react"

import { FIELD_IDS, type FieldKey } from "@/components/documentos/use-register-form"

interface ErrorSummaryProps {
  ref: React.Ref<HTMLDivElement>
  fields: FieldKey[]
  errors: Partial<Record<FieldKey, string>>
  serverError: string | null
}

/** Resumen de errores arriba del formulario al enviar; cada ítem lleva al campo. */
export function ErrorSummary({ ref, fields, errors, serverError }: ErrorSummaryProps) {
  const focusField = (e: React.MouseEvent<HTMLAnchorElement>, key: FieldKey) => {
    e.preventDefault()
    const el = document.getElementById(FIELD_IDS[key])
    el?.focus()
    el?.scrollIntoView({ block: "center", behavior: "smooth" })
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="flex gap-3 rounded-md bg-error-suave px-4 py-3 text-small text-error-texto outline-none focus-visible:outline-2 focus-visible:outline-acento"
    >
      <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        {serverError ? (
          <p className="font-semibold">{serverError}</p>
        ) : (
          <>
            <p className="font-semibold">
              {fields.length === 1 ? "Corrige 1 campo para continuar:" : `Corrige ${fields.length} campos para continuar:`}
            </p>
            <ul className="flex list-disc flex-col gap-0.5 pl-4">
              {fields.map((k) => (
                <li key={k}>
                  <a href={`#${FIELD_IDS[k]}`} onClick={(e) => focusField(e, k)} className="underline underline-offset-2">
                    {errors[k]}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
