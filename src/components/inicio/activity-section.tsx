import { ActivityFeed } from "@/components/inicio/activity-feed"
import { ActivityPanel } from "@/components/inicio/activity-panel"
import { SectionError } from "@/components/ui/section-error"
import { getRecentActivity } from "@/lib/data/queries"
import type { ActivityEvent } from "@/lib/types"

/** Actividad reciente: 5 últimos eventos visibles para el usuario. */
export async function ActivitySection() {
  let events: ActivityEvent[] | null
  try {
    events = await getRecentActivity(5)
  } catch {
    events = null
  }
  return (
    <ActivityPanel>
      {events ? <ActivityFeed events={events} /> : <SectionError title="No pudimos cargar la actividad reciente." className="mb-4" />}
    </ActivityPanel>
  )
}
