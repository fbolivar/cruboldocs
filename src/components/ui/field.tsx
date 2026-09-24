import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldProps {
  id: string
  label: string
  help?: string
  error?: string | null
  required?: boolean
  className?: string
  /** Recibe los atributos ARIA para el control. */
  children: (aria: { id: string; "aria-describedby"?: string; "aria-invalid"?: true; required?: boolean }) => React.ReactNode
}

/** Label arriba, control, ayuda y error bajo el campo enlazados por aria-describedby. */
export function Field({ id, label, help, error, required, className, children }: FieldProps) {
  const helpId = help ? `${id}-ayuda` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-label">
        {label}
        {required && <span className="text-texto-sec"> (obligatorio)</span>}
      </Label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required })}
      {help && (
        <p id={helpId} className="text-small text-texto-sec">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-small text-error-texto">
          {error}
        </p>
      )}
    </div>
  )
}

/** Título de sección dentro de formularios largos (rótulo caption). */
export function FormSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex flex-col gap-4", className)}>
      <legend className="mb-4 text-caption text-texto-sec uppercase">{title}</legend>
      {children}
    </fieldset>
  )
}
