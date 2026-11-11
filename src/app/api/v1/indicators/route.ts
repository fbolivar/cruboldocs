import { NextResponse } from "next/server"

import { authenticate, pageParams } from "@/lib/api/keys"
import { readIndicators } from "@/lib/api/read"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticate(request, "read:indicators")
  if (!auth.ok) return auth.response
  const page = pageParams(request.url)
  const data = await readIndicators(auth.org, page)
  return NextResponse.json({ data, nextOffset: data.length === page.limit ? page.offset + page.limit : null })
}
