"use client"

import { FlaskConicalIcon, LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout, setDemoScenario, setDemoUser } from "@/lib/data/actions"
import type { DemoScenario } from "@/lib/data/demo"
import type { CurrentUser } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface DemoOptions {
  users: { id: string; label: string; name: string }[]
  scenarios: { id: DemoScenario; label: string }[]
  scenario: DemoScenario
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-acento text-small font-semibold text-superficie", className)}
    >
      {initials(name)}
    </span>
  )
}

/** Menú de cuenta. En desarrollo incluye "Ver como" y "Simular estado" para revisar roles y estados. */
export function UserMenu({ user, demo }: { user: CurrentUser; demo: DemoOptions | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const run = (fn: () => Promise<void>) => startTransition(async () => {
    await fn()
    router.refresh()
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-11 place-items-center rounded-full md:size-8" aria-label={`Cuenta de ${user.fullName}`}>
        <Avatar name={user.fullName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-body font-medium text-texto">{user.fullName}</span>
          <span className="text-small font-normal text-texto-sec">{user.positionName ?? (user.isPlatformAdmin ? "Superadministrador" : "Sin cargo")}</span>
          <span className="text-small font-normal text-texto-sec">{user.email}</span>
        </DropdownMenuLabel>
        {demo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5 text-caption text-texto-sec uppercase">
                <FlaskConicalIcon className="size-3.5" aria-hidden="true" /> Solo desarrollo
              </DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Ver como…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-80">
                  <DropdownMenuRadioGroup value={user.id} onValueChange={(id) => run(() => setDemoUser(id))}>
                    {demo.users.map((u) => (
                      <DropdownMenuRadioItem key={u.id} value={u.id} className="flex-col items-start">
                        <span>{u.name}</span>
                        <span className="text-small text-texto-sec">{u.label}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Simular estado…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={demo.scenario} onValueChange={(s) => run(() => setDemoScenario(s as DemoScenario))}>
                    {demo.scenarios.map((s) => (
                      <DropdownMenuRadioItem key={s.id} value={s.id}>
                        {s.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => startTransition(() => logout())}>
          <LogOutIcon aria-hidden="true" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
