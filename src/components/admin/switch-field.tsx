"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SwitchFieldProps {
  id: string
  label: string
  help?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/** Switch con label a la izquierda y ayuda enlazada por aria-describedby. */
export function SwitchField({ id, label, help, checked, onCheckedChange, disabled }: SwitchFieldProps) {
  const helpId = help ? `${id}-ayuda` : undefined
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id} className="text-label">
          {label}
        </Label>
        {help && (
          <p id={helpId} className="text-small text-texto-sec">
            {help}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={helpId}
        className="mt-0.5"
      />
    </div>
  )
}
