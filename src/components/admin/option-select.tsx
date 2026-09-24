"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: string
}

interface OptionSelectProps {
  /** Atributos ARIA que entrega `<Field>` (id, aria-describedby, aria-invalid). */
  aria?: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }
  "aria-label"?: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Select de shadcn con opciones simples; el valor "" muestra el placeholder. */
export function OptionSelect({ aria, options, value, onChange, placeholder = "Elige una opción", className, ...rest }: OptionSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        id={aria?.id}
        aria-describedby={aria?.["aria-describedby"]}
        aria-invalid={aria?.["aria-invalid"]}
        aria-label={rest["aria-label"]}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="min-h-11 md:min-h-8">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
