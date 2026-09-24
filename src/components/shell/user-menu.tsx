"use client"

import { Building2Icon, LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

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
import { logout, setActiveOrganization } from "@/lib/data/actions"
import type { CurrentUser } from "@/lib/types"
import { cn } from "@/lib/utils"

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

/** Menú de cuenta. Con varias organizaciones (o Superadmin) permite cambiar la activa. */
export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const switchOrg = (id: string) =>
    startTransition(async () => {
      const res = await setActiveOrganization(id)
      if (!res.ok) return void toast.error(res.error)
      router.push("/app")
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
        {user.organizations.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Building2Icon aria-hidden="true" /> Cambiar organización
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72">
                  <DropdownMenuRadioGroup value={user.organization.id} onValueChange={switchOrg}>
                    {user.organizations.map((o) => (
                      <DropdownMenuRadioItem key={o.id} value={o.id}>
                        {o.name}
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
