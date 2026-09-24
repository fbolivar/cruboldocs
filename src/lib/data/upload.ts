"use client"

import type { UploadTicket } from "@/lib/data/storage"
import { createClient } from "@/lib/supabase/browser"

// Algunos sistemas no informan el tipo de archivos de Office; el bucket lo exige.
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

/** Sube el archivo directo a Storage con la URL firmada que emitió el servidor. */
export async function uploadToTicket(ticket: UploadTicket, file: File): Promise<void> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const { error } = await createClient()
    .storage.from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: MIME_BY_EXT[ext] ?? (file.type || "application/octet-stream"),
      upsert: true,
    })
  if (error) throw error
}
