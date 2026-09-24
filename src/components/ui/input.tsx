import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-sm border border-borde-fuerte bg-superficie px-3 text-body text-texto transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-small file:font-medium placeholder:text-texto-sec disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-superficie-alt disabled:opacity-60 aria-invalid:border-error md:h-9",
        className
      )}
      {...props}
    />
  )
}

export { Input }
