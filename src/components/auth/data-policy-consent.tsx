"use client"

import { DATA_POLICY_HREF } from "@/components/auth/auth-card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface DataPolicyConsentProps {
  id: string
  checked: boolean
  error?: string | null
  onCheckedChange: (checked: boolean) => void
}

/** Casilla obligatoria de aceptación del tratamiento de datos personales (Ley 1581). */
export function DataPolicyConsent({ id, checked, error, onCheckedChange }: DataPolicyConsentProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3 py-1">
        <Checkbox
          id={id}
          name="acceptsDataPolicy"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="block text-small leading-5 font-normal text-texto">
          Acepto la{" "}
          <a
            href={DATA_POLICY_HREF}
            target="_blank"
            rel="noopener"
            className="font-medium text-acento underline underline-offset-4"
          >
            política de tratamiento de datos personales
          </a>{" "}
          (Ley 1581 de 2012).
        </Label>
      </div>
      {error && (
        <p id={errorId} className="text-small text-error-texto">
          {error}
        </p>
      )}
    </div>
  )
}
