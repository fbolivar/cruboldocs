import { ClipboardCheckIcon, FileTextIcon, HouseIcon, SettingsIcon, TriangleAlertIcon } from "lucide-react"

import type { NavIcon as NavIconName } from "@/components/shell/nav-items"

const ICONS = { inicio: HouseIcon, documentos: FileTextIcon, riesgos: TriangleAlertIcon, noconf: ClipboardCheckIcon, admin: SettingsIcon }

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name]
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />
}
