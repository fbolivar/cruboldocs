import "server-only"

import { createServerClient } from "@supabase/ssr"
import { createClient as createPlainClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/lib/supabase/database.types"

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/** Cliente con la sesión del usuario (cookies): toda lectura y escritura pasa por RLS. */
export async function createClient() {
  const store = await cookies()
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // En Server Components no se pueden escribir cookies; el proxy refresca la sesión.
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {}
      },
    },
  })
}

/**
 * Cliente con la clave secreta: salta RLS. Solo para lo que el diseño asigna al servidor
 * (firmas tras reautenticación, invitaciones, outbox, URLs de subida, job diario).
 * Nunca se usa para leer datos en nombre del usuario.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.")
  return createPlainClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Cliente efímero sin cookies: reautenticación del firmante sin tocar la sesión del navegador. */
export function createEphemeralClient() {
  return createPlainClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
