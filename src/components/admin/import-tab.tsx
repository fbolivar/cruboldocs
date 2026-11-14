import { ImportPanel } from "@/components/admin/import-panel"
import { IntegrationsHelp } from "@/components/admin/integrations-help"

/** Pestaña "Importar" de Administración: carga CSV + ayuda de integraciones (v1.6-4). */
export function ImportTab() {
  return (
    <div className="flex flex-col gap-6">
      <ImportPanel />
      <IntegrationsHelp />
    </div>
  )
}
