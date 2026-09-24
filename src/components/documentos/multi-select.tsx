"use client"

import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  id?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  /** Texto del disparador sin selección (también nombre accesible si no hay label). */
  placeholder: string
  /** Muestra "Estado: 2" en lugar de la lista de nombres. */
  summaryLabel?: string
  searchable?: boolean
  className?: string
  onBlur?: () => void
  "aria-describedby"?: string
  "aria-invalid"?: true
}

/** Selección múltiple con Popover + Command. Cada opción marcada lleva check (no solo color). */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  summaryLabel,
  searchable = false,
  className,
  onBlur,
  ...aria
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.filter((o) => value.includes(o.value))
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  const text =
    selected.length === 0
      ? placeholder
      : summaryLabel
        ? `${summaryLabel}: ${selected.length === 1 ? selected[0].label : selected.length}`
        : selected.map((o) => o.label).join(", ")

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          {...aria}
          className={cn(
            "flex h-11 min-w-0 items-center justify-between gap-2 rounded-sm border bg-superficie px-3 text-left text-body transition-colors duration-150 md:h-9",
            selected.length > 0 && summaryLabel
              ? "border-acento bg-acento-suave text-acento"
              : "border-borde-fuerte text-texto",
            aria["aria-invalid"] && "border-error",
            className
          )}
        >
          <span className={cn("truncate", selected.length === 0 && "text-texto-sec")}>{text}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-texto-sec" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-60 p-0">
        <Command>
          {searchable && <CommandInput placeholder="Buscar" />}
          <CommandList>
            <CommandEmpty className="py-4 text-center text-small text-texto-sec">Sin resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = value.includes(o.value)
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    data-checked={checked}
                    onSelect={() => toggle(o.value)}
                    className="min-h-11 text-body md:min-h-8"
                  >
                    {o.label}
                    {checked && <span className="sr-only"> (seleccionado)</span>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
