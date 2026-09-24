import type { Metadata } from "next"
import { cookies } from "next/headers"

import { AppSidebar, SIDEBAR_COOKIE } from "@/components/shell/app-sidebar"
import { BreadcrumbProvider } from "@/components/shell/breadcrumb-context"
import { MobileTabBar } from "@/components/shell/mobile-tab-bar"
import { navItemsFor } from "@/components/shell/nav-items"
import { MobileTopbar, Topbar } from "@/components/shell/topbar"
import type { DemoOptions } from "@/components/shell/user-menu"
import { DEMO_SCENARIOS, demoScenario } from "@/lib/data/demo"
import { demoUsers } from "@/lib/data/mock-data"
import { getCurrentUser, getMyTasks } from "@/lib/data/queries"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await getCurrentUser()
  const items = navItemsFor(user)
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1"
  // El contador es un dato vivo del shell; si falla, se oculta sin romper la página.
  const taskCount = await getMyTasks(user).then((t) => t.length, () => null)

  const demo: DemoOptions | null =
    process.env.NODE_ENV === "production"
      ? null
      : {
          users: demoUsers.map((d) => ({ id: d.user.id, name: d.user.fullName, label: d.label })),
          scenarios: DEMO_SCENARIOS,
          scenario: await demoScenario(),
        }

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-dvh">
        <AppSidebar items={items} organizationName={user.organization.name} taskCount={taskCount} initialCollapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} items={items} demo={demo} />
          <MobileTopbar user={user} items={items} demo={demo} />
          <main id="contenido" className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar items={items} taskCount={taskCount} />
    </BreadcrumbProvider>
  )
}
