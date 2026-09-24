"use client"

import { useEffect, useImperativeHandle, useRef } from "react"
import type * as React from "react"

// Cloudflare Turnstile con el script oficial (render explícito, sin dependencia). El token
// es de un solo uso: el formulario llama `reset()` después de cada envío.

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
let loader: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile no cargó")))
    script.onerror = () => {
      loader = null
      reject(new Error("Turnstile no cargó"))
    }
    document.head.appendChild(script)
  })
  return loader
}

export type TurnstileHandle = { reset: () => void }

export function Turnstile({
  action,
  onToken,
  ref,
}: {
  action: "login" | "recuperar" | "invitacion"
  onToken: (token: string | null) => void
  ref?: React.Ref<TurnstileHandle>
}) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  })

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null)
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
    },
  }))

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) return
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          action,
          language: "es",
          size: "flexible",
          theme: "light",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [action])

  return <div ref={container} className="min-h-[65px]" />
}

/** Sin clave de sitio (desarrollo) el formulario no espera token; el servidor decide. */
export const CAPTCHA_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** Mensaje cuando se envía sin completar la verificación. */
export const CAPTCHA_PENDING = "Espera a que se complete la verificación de seguridad."
