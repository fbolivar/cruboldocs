import { ApiKeysPanel } from "@/components/admin/api-keys-panel"
import { WebhooksPanel } from "@/components/admin/api-webhooks-panel"
import { listApiKeys, listWebhookEndpoints } from "@/lib/data/queries"

export async function ApiKeysTab() {
  const [keys, endpoints] = await Promise.all([listApiKeys(), listWebhookEndpoints()])
  return (
    <div className="flex flex-col gap-8">
      <ApiKeysPanel keys={keys} />
      <WebhooksPanel endpoints={endpoints} />
    </div>
  )
}
