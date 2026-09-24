import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/data/actions"

export const metadata: Metadata = { title: "Sin acceso" }

/** Sesión válida pero sin membresía vigente (acceso vencido, revocado u organización suspendida). */
export default function NoAccessPage() {
  return (
    <AuthCard aria-labelledby="no-access-title">
      <h1 id="no-access-title">Tu acceso no está vigente</h1>
      <p className="text-body-lg text-texto-sec">
        Tu cuenta existe, pero no tienes acceso activo a ninguna organización. Si crees que es un error, escribe al
        administrador de tu empresa para que renueve tu acceso.
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </AuthCard>
  )
}
