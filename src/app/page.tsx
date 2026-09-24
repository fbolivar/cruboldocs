import { redirect } from "next/navigation"

// Con sesión, el proxy ya redirige `/` a /app; aquí solo llega quien no ha ingresado.
export default function Home() {
  redirect("/login")
}
