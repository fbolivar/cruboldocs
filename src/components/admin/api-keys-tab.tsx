import { ApiKeysPanel } from "@/components/admin/api-keys-panel"
import { listApiKeys } from "@/lib/data/queries"

export async function ApiKeysTab() {
  const keys = await listApiKeys()
  return <ApiKeysPanel keys={keys} />
}
