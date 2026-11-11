import type { Metadata } from "next"
import { cookies } from "next/headers"

import { AppSidebar, SIDEBAR_COOKIE } from "@/components/shell/app-sidebar"
import { BreadcrumbProvider } from "@/components/shell/breadcrumb-context"
import { MobileTabBar } from "@/components/shell/mobile-tab-bar"
import { navItemsFor } from "@/components/shell/nav-items"
import { TaskCountBadge } from "@/components/shell/task-count-badge"
import { MobileTopbar, Topbar } from "@/components/shell/topbar"
import { PwaShell } from "@/components/pwa/pwa-shell"
import { getCurrentUser } from "@/lib/data/queries"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await getCurrentUser()
  const items = navItemsFor(user)
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1"
  const taskBadge = <TaskCountBadge user={user} />

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-dvh">
        <AppSidebar items={items} organizationName={user.organization.name} taskBadge={taskBadge} initialCollapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} items={items} />
          <MobileTopbar user={user} items={items} />
          <main id="contenido" className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar items={items} taskBadge={taskBadge} />
      <PwaShell />
    </BreadcrumbProvider>
  )
}
