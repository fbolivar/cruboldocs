import { TabError } from "@/components/admin/tab-layout"
import { NotifiersManager } from "@/components/notificaciones/notifiers-manager"
import { listChatNotifiers } from "@/lib/data/queries"
import type { ChatNotifierView } from "@/lib/types"

/** Pestaña "Notificaciones" de Administración: canales de Slack/Teams (v1.4-7). */
export async function NotifiersTab() {
  let notifiers: ChatNotifierView[]
  try {
    notifiers = await listChatNotifiers()
  } catch {
    return <TabError />
  }
  return <NotifiersManager notifiers={notifiers} />
}
