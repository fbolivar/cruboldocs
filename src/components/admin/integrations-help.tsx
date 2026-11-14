import { Card } from "@/components/ui/card"

/** Bloque informativo para conectar CrubolDocs con Zapier/Make sobre la API existente (ADR-124). */
export function IntegrationsHelp() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-body font-medium">Conectar con Zapier / Make</h3>
      <p className="text-small text-texto-sec">
        Crea una API key en la pestaña <span className="font-medium">API</span> y úsala como autenticación tipo
        <span className="font-mono"> Bearer</span>. El test de conexión es <span className="font-mono">GET /api/v1/me</span>
        (devuelve tu organización y los permisos de la clave).
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-caption font-medium text-texto-sec">Triggers (eventos)</dt>
          <dd className="text-small text-texto-sec">Webhooks firmados de creación: no conformidad, medición de indicador, PQRS y salida no conforme.</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-texto-sec">Acciones</dt>
          <dd className="text-small text-texto-sec">POST para crear no conformidad, medición, PQRS y salida no conforme (con Idempotency-Key).</dd>
        </div>
      </dl>
      <p className="text-caption text-texto-sec">Guía completa de recetas y verificación de firma en <span className="font-mono">docs/api/INTEGRACIONES.md</span>.</p>
    </Card>
  )
}
