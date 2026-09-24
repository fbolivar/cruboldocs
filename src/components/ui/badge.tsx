import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Badge de estado: siempre punto/ícono + texto, nunca solo color (tokens.md §2).
const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-sm px-2 text-caption font-medium tracking-normal whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        exito: "bg-exito-suave text-exito-texto",
        advertencia: "bg-advertencia-suave text-advertencia-texto",
        error: "bg-error-suave text-error-texto",
        info: "bg-acento-suave text-acento",
        neutro: "bg-superficie-alt text-texto-sec",
      },
    },
    defaultVariants: { tone: "neutro" },
  }
)

interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /** Ícono en lugar del punto. */
  icon?: React.ReactNode
  /** Oculta el punto (p. ej. conteos). */
  plain?: boolean
}

function Badge({ className, tone, icon, plain, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon ?? (!plain && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />)}
      {children}
    </span>
  )
}

/** Etiqueta neutra de tipo (chip), p. ej. tipo de tarea o de control. */
function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center rounded-sm bg-superficie-alt px-2 text-caption font-medium tracking-normal whitespace-nowrap text-texto",
        className
      )}
      {...props}
    />
  )
}

export { Badge, Chip, badgeVariants }
