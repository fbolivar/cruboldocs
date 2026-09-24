"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type * as React from "react"
import { toast } from "sonner"

import { DataPolicyConsent } from "@/components/auth/data-policy-consent"
import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { joinOrganization } from "@/lib/data/actions"

const CONSENT_ERROR = "Marca la casilla para aceptar el tratamiento de tus datos y continuar."

/** Unirse a la organización con la cuenta que ya tiene la sesión iniciada (mismo correo invitado). */
export function InvitationJoin({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter()
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!consent) {
      setConsentError(CONSENT_ERROR)
      document.getElementById("join-consent")?.focus()
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await joinOrganization(token, { acceptsDataPolicy: consent })
      if (!res.ok) {
        setFormError(res.error)
        return
      }
      toast.success(`Te uniste a ${organizationName}`)
      router.push("/app")
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <DataPolicyConsent
        id="join-consent"
        checked={consent}
        error={consentError}
        onCheckedChange={(v) => {
          setConsent(v)
          if (v) setConsentError(null)
        }}
      />
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Uniéndote…" : `Unirme a ${organizationName}`}
      </Button>
    </form>
  )
}
