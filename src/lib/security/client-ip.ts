import "server-only"

import { headers } from "next/headers"

const IP = /^[0-9a-fA-F:.]{3,45}$/

/**
 * IP del usuario final.
 *
 * Detrás del proxy de Cloudflare, Vercel ve como "cliente" a Cloudflare, así que
 * `x-vercel-forwarded-for` trae una IP de Cloudflare, no la del usuario. Cloudflare manda
 * la IP real en `cf-connecting-ip`, pero esa cabecera es falsificable si alguien golpea el
 * origen de Vercel directo. Por eso solo confiamos en ella cuando la petición trae el secreto
 * compartido que Cloudflare inyecta en el edge (`CF_PROXY_SECRET`); si no, usamos la cabecera
 * de la plataforma (`x-vercel-forwarded-for`), que el cliente no puede falsificar, o
 * `x-forwarded-for` en desarrollo.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const secret = process.env.CF_PROXY_SECRET
  const viaCloudflare = !!secret && h.get("x-proxy-secret") === secret
  const raw = viaCloudflare
    ? h.get("cf-connecting-ip")
    : (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for"))
  const ip = raw?.split(",")[0]?.trim()
  return ip && IP.test(ip) ? ip : null
}
