"use client"

import type { UploadTicket } from "@/lib/data/storage"
import { extensionOf, MIME_BY_EXT } from "@/lib/domain/files"
import { createClient } from "@/lib/supabase/browser"

/**
 * Sube el archivo directo a Storage con la URL firmada que emitió el servidor. La ruta es
 * temporal y no admite sobrescritura; el servidor la valida y la mueve a la ruta final.
 */
export async function uploadToTicket(ticket: UploadTicket, file: File): Promise<void> {
  // Algunos sistemas no informan el tipo de archivos de Office; el bucket lo exige.
  const { error } = await createClient()
    .storage.from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: MIME_BY_EXT[extensionOf(file.name)] ?? "application/octet-stream",
      upsert: false,
    })
  if (error) throw error
}
