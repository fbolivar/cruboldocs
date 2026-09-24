"use client"

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Toasts: 4 s, máx. 3 apilados, abajo a la derecha en escritorio y arriba en móvil (spec-shell).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      duration={4000}
      visibleToasts={3}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-acento-claro" />,
        info: <InfoIcon className="size-4 text-acento-claro" />,
        warning: <TriangleAlertIcon className="size-4 text-advertencia" />,
        error: <OctagonXIcon className="size-4 text-error" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-texto)",
          "--normal-text": "var(--color-superficie)",
          "--normal-border": "var(--color-texto)",
          "--border-radius": "var(--radio-md)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "shadow-md text-small font-sans" } }}
      {...props}
    />
  )
}

export { Toaster }
