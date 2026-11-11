// CrubolDocs — Service worker (PWA offline de formularios, ADR-058).
// Estrategia CONSERVADORA: network-first en navegación (el online nunca se ve afectado); la caché
// solo se usa como respaldo sin conexión. Assets hasheados: cache-first. API/acciones/Supabase:
// network-only (nunca se cachean). Las cachés se versionan y se limpian al cerrar sesión (mensaje).
const VERSION = "v1"
const STATIC_CACHE = `cd-static-${VERSION}`
const PAGES_CACHE = `cd-pages-${VERSION}`
const KEEP = [STATIC_CACHE, PAGES_CACHE]

self.addEventListener("install", () => {
  // No se precachea nada crítico; el nuevo SW espera hasta que el usuario recargue (SwUpdatePrompt).
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

// Mensajes desde la app: aplicar actualización o limpiar cachés al cerrar sesión.
self.addEventListener("message", (event) => {
  const data = event.data || {}
  if (data.type === "SKIP_WAITING") self.skipWaiting()
  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
  }
})

// Solo cacheamos las páginas de diligenciar formularios (para usarlas sin conexión).
function isResponderPage(url) {
  return url.pathname.startsWith("/app/formularios/") && url.pathname.includes("/responder")
}
function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg" || url.pathname === "/manifest.webmanifest"
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Assets inmutables: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        try {
          const res = await fetch(req)
          if (res.ok) cache.put(req, res.clone())
          return res
        } catch {
          return hit || Response.error()
        }
      }),
    )
    return
  }

  // Páginas de diligenciar: network-first con respaldo a caché (para uso sin conexión).
  const isNav = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")
  if (isResponderPage(url) && (isNav || url.searchParams.has("_rsc"))) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) {
            const cache = await caches.open(PAGES_CACHE)
            cache.put(req, res.clone())
          }
          return res
        } catch {
          const cache = await caches.open(PAGES_CACHE)
          const hit = await cache.match(req, { ignoreSearch: false })
          return hit || (await cache.match(req, { ignoreSearch: true })) || Response.error()
        }
      })(),
    )
    return
  }
  // Todo lo demás: red directa (sin caché).
})
