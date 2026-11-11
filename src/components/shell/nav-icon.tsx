import { BarChart3Icon, BookOpenCheckIcon, ChartLineIcon, ClipboardCheckIcon, ClipboardListIcon, ClipboardPenIcon, CompassIcon, FileTextIcon, GaugeIcon, GraduationCapIcon, HardHatIcon, HouseIcon, LayoutDashboardIcon, LeafIcon, LightbulbIcon, ListChecksIcon, MessagesSquareIcon, NetworkIcon, NotebookPenIcon, PackageXIcon, RefreshCwIcon, ScaleIcon, SettingsIcon, ShieldCheckIcon, TargetIcon, TruckIcon, TriangleAlertIcon, WorkflowIcon } from "lucide-react"

import type { NavIcon as NavIconName } from "@/components/shell/nav-items"

const ICONS = { inicio: HouseIcon, tablero: LayoutDashboardIcon, documentos: FileTextIcon, contexto: CompassIcon, procesos: NetworkIcon, riesgos: TriangleAlertIcon, noconf: ClipboardCheckIcon, salidas: PackageXIcon, auditorias: ClipboardListIcon, indicadores: ChartLineIcon, revisiones: ClipboardPenIcon, competencias: GraduationCapIcon, proveedores: TruckIcon, pqrs: MessagesSquareIcon, actas: NotebookPenIcon, objetivos: TargetIcon, legal: ScaleIcon, peligros: HardHatIcon, ambiental: LeafIcon, sgsst: ShieldCheckIcon, metrologia: GaugeIcon, cambios: RefreshCwIcon, formularios: ListChecksIcon, capacitacion: BookOpenCheckIcon, conocimiento: LightbulbIcon, solicitudes: WorkflowIcon, informes: BarChart3Icon, admin: SettingsIcon }

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name]
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />
}
