import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Variantes según design/tokens.md: primario (acento), secundario (borde), ghost
// (texto acento), destructivo (error-texto con texto blanco). Alto 44 en móvil, 36 en escritorio.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-acento text-superficie hover:bg-acento-hover active:bg-acento-hover",
        outline:
          "border-borde-fuerte bg-superficie text-texto hover:bg-superficie-alt aria-expanded:bg-superficie-alt",
        ghost: "text-acento hover:bg-acento-suave aria-expanded:bg-acento-suave",
        destructive: "bg-error-texto text-superficie hover:bg-error-texto/90",
        link: "h-auto px-0 text-acento underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 text-body md:h-9",
        sm: "h-11 px-3 text-small md:h-8",
        icon: "size-11 text-texto-sec hover:bg-superficie-alt md:size-8",
        "icon-sm": "size-8 text-texto-sec hover:bg-superficie-alt",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
