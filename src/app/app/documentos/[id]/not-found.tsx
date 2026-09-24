import { FileSearchIcon } from "lucide-react"
import Link from "next/link"

import { Page } from "@/components/shell/page"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/** Documento inexistente o sin permiso: mismo mensaje para no revelar si existe. */
export default function DocumentoNotFound() {
  return (
    <Page>
      <h1 className="sr-only">Documento no encontrado</h1>
      <EmptyState
        icon={FileSearchIcon}
        title="No encontramos este documento o no tienes acceso."
        action={
          <Button asChild>
            <Link href="/app/documentos">Volver a documentos</Link>
          </Button>
        }
      />
    </Page>
  )
}
