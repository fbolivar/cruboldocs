import "server-only"

import { createHash, randomBytes } from "node:crypto"

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex")
}

/** Token de invitación (URL-safe, 256 bits). En la base solo se guarda su SHA-256. */
export function newToken(): string {
  return randomBytes(32).toString("base64url")
}
