"use client"

import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { Page } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Error inesperado de una pantalla completa (los errores de sección se manejan en cada sección). */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Page>
      <EmptyState
        icon={TriangleAlertIcon}
        title="No pudimos cargar esta pantalla."
        description="Puede ser un problema de conexión. Inténtalo de nuevo; si continúa, escribe a soporte@crubol.co."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Reintentar</Button>
            <Button variant="outline" asChild>
              <Link href="/app">Ir al inicio</Link>
            </Button>
          </div>
        }
      />
    </Page>
  )
}
