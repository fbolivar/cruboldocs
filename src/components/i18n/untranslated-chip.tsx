"use client"

import { Badge } from "@/components/ui/badge"
import { useDict } from "@/lib/i18n/provider"

/** Marca discreta de que un texto cae al original por falta de traducción (v1.4-4). */
export function UntranslatedChip() {
  const dict = useDict()
  return <Badge tone="neutro">{dict.common.untranslated}</Badge>
}
