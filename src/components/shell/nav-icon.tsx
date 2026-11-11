import { ChartLineIcon, ClipboardCheckIcon, ClipboardListIcon, ClipboardPenIcon, FileTextIcon, GraduationCapIcon, HardHatIcon, HouseIcon, LayoutDashboardIcon, LeafIcon, ListChecksIcon, MessagesSquareIcon, NotebookPenIcon, ScaleIcon, SettingsIcon, ShieldCheckIcon, TargetIcon, TruckIcon, TriangleAlertIcon } from "lucide-react"

import type { NavIcon as NavIconName } from "@/components/shell/nav-items"

const ICONS = { inicio: HouseIcon, tablero: LayoutDashboardIcon, documentos: FileTextIcon, riesgos: TriangleAlertIcon, noconf: ClipboardCheckIcon, auditorias: ClipboardListIcon, indicadores: ChartLineIcon, revisiones: ClipboardPenIcon, competencias: GraduationCapIcon, proveedores: TruckIcon, pqrs: MessagesSquareIcon, actas: NotebookPenIcon, objetivos: TargetIcon, legal: ScaleIcon, peligros: HardHatIcon, ambiental: LeafIcon, sgsst: ShieldCheckIcon, formularios: ListChecksIcon, admin: SettingsIcon }

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name]
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />
}
