"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SectionErrorProps {
  title: string
  description?: string
  className?: string
}

/** Error de una sección: la sección degrada, el resto de la página sigue visible. */
export function SectionError({ title, description = "Revisa tu conexión e inténtalo de nuevo.", className }: SectionErrorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div
      role="alert"
      className={cn("flex flex-wrap items-start gap-3 rounded-md bg-error-suave px-4 py-3 text-small text-error-texto", className)}
    >
      <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p>{description}</p>
      </div>
      <Button variant="outline" size="sm" loading={pending} onClick={() => startTransition(() => router.refresh())}>
        Reintentar
      </Button>
    </div>
  )
}
