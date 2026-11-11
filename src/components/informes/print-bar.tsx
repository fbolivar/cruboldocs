"use client"

import { ChevronLeftIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link href={backHref}><ChevronLeftIcon /> Volver</Link>
      </Button>
      <Button size="sm" onClick={() => window.print()}><PrinterIcon /> Imprimir / PDF</Button>
    </div>
  )
}
