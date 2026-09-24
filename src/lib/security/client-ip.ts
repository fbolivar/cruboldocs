import "server-only"

import { headers } from "next/headers"

const IP = /^[0-9a-fA-F:.]{3,45}$/

/**
 * IP del usuario final. En Vercel, `x-vercel-forwarded-for` la fija la plataforma y el
 * cliente no la puede falsificar; fuera de Vercel (desarrollo) se usa `x-forwarded-for`.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")
  const ip = raw?.split(",")[0]?.trim()
  return ip && IP.test(ip) ? ip : null
}
