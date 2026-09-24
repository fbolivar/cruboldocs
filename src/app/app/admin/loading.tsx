import { TabSkeleton } from "@/components/admin/tab-skeleton"
import { Page } from "@/components/shell/page"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <Page wide>
      <h1>Administración</h1>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex gap-4 overflow-hidden border-b border-borde pb-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-24 shrink-0" />
          ))}
        </div>
        <TabSkeleton />
      </div>
    </Page>
  )
}
