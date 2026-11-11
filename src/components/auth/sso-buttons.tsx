"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"

const GOOGLE_ON = process.env.NEXT_PUBLIC_SSO_GOOGLE === "1"
const MICROSOFT_ON = process.env.NEXT_PUBLIC_SSO_MICROSOFT === "1"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.5-4.8H1.5v3C3.5 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.5 14.4a7.2 7.2 0 0 1 0-4.8v-3H1.5a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.5 6.6l4 3a7.2 7.2 0 0 1 6.5-4.8z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  )
}

export function SsoButtons({ next = "/app" }: { next?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"google" | "azure" | null>(null)
  if (!GOOGLE_ON && !MICROSOFT_ON) return null

  async function signIn(provider: "google" | "azure") {
    setBusy(provider)
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } })
      if (error) { setBusy(null); router.push("/login?sso=error") }
    } catch {
      setBusy(null)
      router.push("/login?sso=error")
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-caption text-texto-sec" aria-hidden="true">
        <span className="h-px flex-1 bg-borde" /> o <span className="h-px flex-1 bg-borde" />
      </div>
      {GOOGLE_ON && (
        <Button variant="outline" className="w-full" onClick={() => signIn("google")} loading={busy === "google"} disabled={busy !== null}>
          <GoogleIcon /> Entrar con Google
        </Button>
      )}
      {MICROSOFT_ON && (
        <Button variant="outline" className="w-full" onClick={() => signIn("azure")} loading={busy === "azure"} disabled={busy !== null}>
          <MicrosoftIcon /> Entrar con Microsoft
        </Button>
      )}
    </div>
  )
}
