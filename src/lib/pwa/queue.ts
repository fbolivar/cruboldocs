// Cola local de respuestas de formularios para diligenciar sin conexión (ADR-058). Usa IndexedDB
// directamente (sin dependencia nueva). Solo en el navegador. La sincronización llama a la misma
// server action que el envío en línea; la validación la hace el servidor.

import type { FieldValue } from "@/lib/types"

export interface QueuedSubmission {
  id: string
  formId: string
  formCode: string
  formTitle: string
  values: Record<string, FieldValue>
  capturedAt: string
  status: "queued" | "error"
  error?: string
}

const DB_NAME = "cruboldocs-offline"
const STORE = "submissions"
const DB_VERSION = 1

function hasIdb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
    t.oncomplete = () => db.close()
  })
}

export async function enqueueSubmission(item: QueuedSubmission): Promise<void> {
  if (!hasIdb()) throw new Error("Sin almacenamiento local disponible.")
  await tx("readwrite", (s) => s.put(item))
}

export async function listQueue(): Promise<QueuedSubmission[]> {
  if (!hasIdb()) return []
  try {
    const all = await tx<QueuedSubmission[]>("readonly", (s) => s.getAll())
    return (all ?? []).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  } catch {
    return []
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  if (!hasIdb()) return
  await tx("readwrite", (s) => s.delete(id))
}

export async function patchQueue(id: string, patch: Partial<QueuedSubmission>): Promise<void> {
  if (!hasIdb()) return
  const current = await tx<QueuedSubmission | undefined>("readonly", (s) => s.get(id))
  if (!current) return
  await tx("readwrite", (s) => s.put({ ...current, ...patch }))
}

export async function countQueue(): Promise<number> {
  if (!hasIdb()) return 0
  try {
    return await tx<number>("readonly", (s) => s.count())
  } catch {
    return 0
  }
}

export async function clearQueue(): Promise<void> {
  if (!hasIdb()) return
  try {
    await tx("readwrite", (s) => s.clear())
  } catch {
    /* noop */
  }
}
