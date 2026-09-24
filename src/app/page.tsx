import { redirect } from "next/navigation"

// `/` redirige a /login o a /app según la sesión. Sin backend todavía: siempre /login.
// TODO(backend): leer la sesión de Supabase y redirigir a /app si existe.
export default function Home() {
  redirect("/login")
}
