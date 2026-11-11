import { TabError } from "@/components/admin/tab-layout"
import { NormsManager } from "@/components/admin/norms-manager"
import { listNorms } from "@/lib/data/queries"
import type { Norm } from "@/lib/types"

export async function NormasTab() {
  let norms: Norm[]
  try {
    norms = await listNorms()
  } catch {
    return <TabError />
  }
  return <NormsManager norms={norms} />
}
