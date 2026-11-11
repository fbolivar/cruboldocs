import { NextResponse } from "next/server"

import { authenticate, pageParams } from "@/lib/api/keys"
import { readRisks } from "@/lib/api/read"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticate(request, "read:risks")
  if (!auth.ok) return auth.response
  const page = pageParams(request.url)
  const data = await readRisks(auth.org, page)
  return NextResponse.json({ data, nextOffset: data.length === page.limit ? page.offset + page.limit : null })
}
