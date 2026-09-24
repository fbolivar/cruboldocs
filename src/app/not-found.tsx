import { SearchXIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        icon={SearchXIcon}
        title="No encontramos esta página."
        description="Revisa la dirección o vuelve al inicio."
        action={
          <Button asChild>
            <Link href="/app">Ir al inicio</Link>
          </Button>
        }
      />
    </main>
  )
}
