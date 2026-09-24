"use client"

import { CheckIcon, UserXIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type Decision = "mantener" | "revocar"

const OPTIONS: { value: Decision; label: string; icon: typeof CheckIcon; checked: string }[] = [
  { value: "mantener", label: "Mantener", icon: CheckIcon, checked: "has-checked:border-exito has-checked:bg-exito-suave has-checked:text-exito-texto" },
  { value: "revocar", label: "Revocar", icon: UserXIcon, checked: "has-checked:border-error has-checked:bg-error-suave has-checked:text-error-texto" },
]

interface RecertDecisionProps {
  id: string
  name: string
  value: Decision | undefined
  disabled?: boolean
  onChange: (d: Decision) => void
}

/** Grupo de radios nativo con aspecto de botones: accesible con teclado (flechas) y lector de pantalla. */
export function RecertDecision({ id, name, value, disabled, onChange }: RecertDecisionProps) {
  return (
    <fieldset className="flex gap-2" disabled={disabled}>
      <legend className="sr-only">Decisión para {name}</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-borde-fuerte bg-superficie px-4 font-medium text-texto transition-colors duration-150 hover:bg-superficie-alt md:h-9 md:flex-none",
            "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-acento has-disabled:cursor-not-allowed has-disabled:opacity-60",
            o.checked
          )}
        >
          <input
            type="radio"
            name={`recert-${id}`}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          <o.icon className="size-4" aria-hidden="true" />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
