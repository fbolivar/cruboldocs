"use client"

// Compresión de imágenes en el cliente (canvas, sin dependencia). Reduce el peso antes de subir
// o encolar: baja el costo de almacenamiento y hace livianos los blobs offline (ADR-072).

const MAX_SIDE = 1600
const QUALITY = 0.85

/** Redimensiona (lado mayor ≤ 1600px) y comprime a JPEG. Devuelve el blob y su extensión. */
export async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return { blob: file, ext: extOf(file) }
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", QUALITY))
  if (!blob) return { blob: file, ext: extOf(file) }
  return { blob, ext: "jpg" }
}

function extOf(file: File): string {
  const n = file.name.toLowerCase()
  if (n.endsWith(".png")) return "png"
  if (n.endsWith(".webp")) return "webp"
  return "jpg"
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file) } catch { /* fallback */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")) }
    img.src = url
  })
}
