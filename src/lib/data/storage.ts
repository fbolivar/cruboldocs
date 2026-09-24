import "server-only"

import { sha256Hex } from "@/lib/data/hash"
import { MAX_FILE_BYTES } from "@/lib/domain/documents"
import { createAdminClient } from "@/lib/supabase/server"

// Archivos en Storage privado. El navegador nunca escribe con su sesión: el servidor
// autoriza la operación, emite una URL de subida firmada y, al terminar, descarga el
// archivo para verificar tamaño, tipo y calcular el SHA-256 que queda en la base.

export type Bucket = "documentos" | "evidencias"

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

const SOURCE_EXT = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"]

/** Nombre seguro para la clave del objeto (sin tildes, espacios ni barras). */
export function safeFileName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return (clean || "archivo").slice(-100)
}

export const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? ""
export const isPdfName = (name: string) => extensionOf(name) === "pdf"
export const isSourceName = (name: string) => SOURCE_EXT.includes(extensionOf(name))

export async function createUploadTicket(bucket: Bucket, path: string): Promise<UploadTicket> {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path, { upsert: true })
  if (error || !data) throw new Error(`No se pudo preparar la subida: ${error?.message}`)
  return { bucket, path: data.path, token: data.token }
}

/** Descarga el objeto subido y lo valida. `expectPdf` exige la firma %PDF- al inicio. */
export async function verifyUpload(bucket: Bucket, path: string, expectPdf = false): Promise<VerifiedFile> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(path)
  if (error || !data) throw new UploadError("No encontramos el archivo subido. Vuelve a adjuntarlo.")
  const bytes = new Uint8Array(await data.arrayBuffer())
  if (bytes.byteLength === 0) throw new UploadError("El archivo está vacío.")
  if (bytes.byteLength > MAX_FILE_BYTES) throw new UploadError("Cada archivo puede pesar hasta 25 MB.")
  if (expectPdf && new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new UploadError("El archivo publicado debe ser un PDF válido.")
  }
  return { path, sha256: sha256Hex(bytes), size: bytes.byteLength }
}

export async function removeObjects(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length) await createAdminClient().storage.from(bucket).remove(paths)
}

/** Error con mensaje apto para el usuario. */
export class UploadError extends Error {}
