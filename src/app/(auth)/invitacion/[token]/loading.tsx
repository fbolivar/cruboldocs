import { AuthCard } from "@/components/auth/auth-card"
import { Skeleton } from "@/components/ui/skeleton"

/** Carga de la invitación: misma estructura que el formulario para evitar saltos de layout. */
export default function InvitationLoading() {
  return (
    <AuthCard aria-busy="true" aria-label="Cargando invitación">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-full" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11 w-full md:h-9" />
        </div>
      ))}
      <Skeleton className="h-11 w-full md:h-9" />
    </AuthCard>
  )
}
