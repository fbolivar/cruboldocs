import { LockIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminTabContent } from "@/components/admin/admin-tab-content"
import { AdminTabsNav } from "@/components/admin/admin-tabs-nav"
import { resolveTab } from "@/components/admin/labels"
import { RecertBadge } from "@/components/admin/recert-badge"
import { TabSkeleton } from "@/components/admin/tab-skeleton"
import { AgentPanel } from "@/components/agente/agent-panel"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getAgentUsage, getCurrentUser, isAgentEnabled } from "@/lib/data/queries"
import { adminTabsFor, canManageCatalog } from "@/lib/domain/access"
import { param } from "@/lib/url"

export const metadata: Metadata = { title: "Administración" }

export default async function AdminPage({ searchParams }: PageProps<"/app/admin">) {
  const sp = await searchParams
  const user = await getCurrentUser()
  const tabs = adminTabsFor(user)

  if (tabs.length === 0) {
    return (
      <Page>
        <PageHeader title="Administración" />
        <EmptyState
          icon={LockIcon}
          title="No tienes acceso a Administración"
          description="Si necesitas configurar usuarios, cargos o procesos, pide acceso al administrador de tu organización."
        />
      </Page>
    )
  }

  const tab = resolveTab(param(sp, "tab"), tabs)
  const showAgent = canManageCatalog(user) && (await isAgentEnabled())
  const usage = showAgent ? await getAgentUsage() : null

  return (
    <Page wide>
      <PageHeader
        title="Administración"
        actions={
          showAgent ? (
            <div className="flex items-center gap-3">
              {usage && (
                <span className="hidden text-caption text-texto-sec sm:inline" aria-label="Uso del agente este mes">
                  Agente: {usage.used}/{usage.limit} este mes
                </span>
              )}
              <AgentPanel
                orgName={user.organization.name}
                initialRemaining={usage?.remaining ?? null}
                monthlyLimit={usage?.limit ?? null}
              />
            </div>
          ) : null
        }
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <AdminTabsNav
          tabs={tabs}
          active={tab}
          recertBadge={
            tabs.includes("recertificacion") ? (
              <Suspense fallback={null}>
                <RecertBadge />
              </Suspense>
            ) : null
          }
        >
          <Suspense key={tab} fallback={<TabSkeleton />}>
            <AdminTabContent tab={tab} sp={sp} />
          </Suspense>
        </AdminTabsNav>
      </div>
    </Page>
  )
}
