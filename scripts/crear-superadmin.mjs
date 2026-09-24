// Crea (o promueve) un Superadministrador de Crubol. Uso único por persona:
//   npm run superadmin -- correo@crubol.com "Nombre Apellido"
// Si el usuario no existe, se crea con una contraseña aleatoria que nadie conoce ni se imprime
// (AUD BAJ-06): la persona fija la suya en /recuperar con su correo. Requiere SUPABASE_SECRET_KEY.
import { randomBytes } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const [email, ...nameParts] = process.argv.slice(2)
const fullName = nameParts.join(" ").trim()
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: npm run superadmin -- correo@dominio.com "Nombre Apellido"')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local")
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const normalized = email.trim().toLowerCase()

const { data: profile } = await admin.from("profiles").select("id").eq("email", normalized).maybeSingle()
let userId = profile?.id
if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: fullName || normalized },
  })
  if (error) {
    console.error("No se pudo crear el usuario:", error.message)
    process.exit(1)
  }
  userId = data.user.id
}

const { error } = await admin.from("platform_admins").upsert({ user_id: userId })
if (error) {
  console.error("No se pudo registrar como Superadmin:", error.message)
  process.exit(1)
}
console.log(`Superadmin listo: ${normalized}`)
if (!profile) console.log("Para ingresar, fija la contraseña en /recuperar con ese correo y luego registra el MFA en /mfa.")
