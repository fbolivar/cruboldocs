// Helpers para leer y escribir filtros en la URL (los filtros son compartibles).

export type SearchParams = Record<string, string | string[] | undefined>

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v || undefined
}

export function paramList(sp: SearchParams, key: string): string[] {
  const v = sp[key]
  if (!v) return []
  return (Array.isArray(v) ? v : v.split(",")).filter(Boolean)
}

/** Devuelve `path?query` con `changes` aplicados; valores vacíos o null eliminan la clave. */
export function withParams(path: string, sp: SearchParams, changes: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue
    q.set(k, Array.isArray(v) ? v.join(",") : v)
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === undefined || v === "") q.delete(k)
    else q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `${path}?${s}` : path
}
