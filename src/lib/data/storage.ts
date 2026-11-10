import "server-only"

import { sha256Hex } from "@/lib/data/hash"
import { MAX_FILE_BYTES } from "@/lib/domain/documents"
import { extensionOf, matchesSignature, MIME_BY_EXT } from "@/lib/domain/files"
import { createAdminClient } from "@/lib/supabase/server"

// Archivos en Storage privado. El navegador nunca escribe con su sesión: el servidor
// autoriza la operación y emite una URL de subida firmada (sin sobrescritura) hacia una
// zona temporal `<base>/subida/<archivo>`. Al terminar, el servidor descarga el archivo,
// lo valida (tamaño, firma binaria), calcula su SHA-256 y escribe esos mismos bytes en la
// ruta final `<base>/<archivo>`, para la que nunca se emitió token: nadie más que el
// servidor puede escribir ahí. La zona temporal no es legible por la RLS (5 segmentos).

export type Bucket = "documentos" | "evidencias" | "nc-evidencias"

export interface UploadTicket {
  bucket: Bucket
  path: string
  token: string
}

export interface VerifiedFile {
  path: string
  sha256: string
  size: number
}

const STAGING = "subida"
/** Nombre de archivo en la clave del objeto: sin barras, `..`, `%` ni `\`. */
const SAFE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/

/** Nombre seguro para la clave del objeto (sin tildes, espacios ni barras). */
export function safeFileName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
  return (clean || "archivo").slice(-100)
}

export const stagingPath = (base: string, fileName: string) => `${base}/${STAGING}/${fileName}`

/**
 * Nombre del archivo si `path` es exactamente una ruta temporal bajo `base`
 * (`<base>/subida/<nombre seguro>`); si no, null. Evita recorridos de ruta.
 */
export function stagedName(path: string, base: string): string | null {
  const prefix = `${base}/${STAGING}/`
  if (typeof path !== "string" || !path.startsWith(prefix)) return null
  const name = path.slice(prefix.length)
  return SAFE_NAME.test(name) ? name : null
}

export async function createUploadTicket(bucket: Bucket, path: string): Promise<UploadTicket> {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path, { upsert: false })
  if (error || !data) throw new Error(`No se pudo preparar la subida: ${error?.message}`)
  return { bucket, path: data.path, token: data.token }
}

/**
 * Valida el archivo temporal y lo promueve a `<base>/<nombre>` con el Content-Type que
 * corresponde a su extensión. `allowed` limita las extensiones aceptadas.
 */
export async function promoteUpload(bucket: Bucket, base: string, path: string, allowed: (ext: string) => boolean): Promise<VerifiedFile> {
  const name = stagedName(path, base)
  if (!name) throw new UploadError("Ruta de archivo inválida.")
  const ext = extensionOf(name)
  if (!allowed(ext)) throw new UploadError("Este tipo de archivo no está permitido.")

  const storage = createAdminClient().storage.from(bucket)
  const { data, error } = await storage.download(path)
  if (error || !data) throw new UploadError("No encontramos el archivo subido. Vuelve a adjuntarlo.")
  const bytes = new Uint8Array(await data.arrayBuffer())
  if (bytes.byteLength === 0) throw new UploadError("El archivo está vacío.")
  if (bytes.byteLength > MAX_FILE_BYTES) throw new UploadError("Cada archivo puede pesar hasta 25 MB.")
  if (!matchesSignature(ext, bytes)) {
    throw new UploadError(ext === "pdf" ? "El archivo publicado debe ser un PDF válido." : "El contenido del archivo no corresponde a su extensión.")
  }

  const finalPath = `${base}/${name}`
  const { error: upErr } = await storage.upload(finalPath, bytes, { contentType: MIME_BY_EXT[ext], upsert: false })
  if (upErr) throw new Error(`No se pudo guardar el archivo: ${upErr.message}`)
  await storage.remove([path])
  return { path: finalPath, sha256: sha256Hex(bytes), size: bytes.byteLength }
}

/** ¿El objeto guardado conserva el SHA-256 registrado? (antes de firmar). */
export async function storedFileMatches(bucket: Bucket, path: string, sha256: string): Promise<boolean> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(path)
  if (error || !data) return false
  return sha256Hex(new Uint8Array(await data.arrayBuffer())) === sha256
}

export async function removeObjects(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length) await createAdminClient().storage.from(bucket).remove(paths)
}

/** Error con mensaje apto para el usuario. */
export class UploadError extends Error {}
