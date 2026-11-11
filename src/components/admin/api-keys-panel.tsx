"use client"

import { CopyIcon, KeyRoundIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createApiKey, revokeApiKey } from "@/lib/data/actions"
import { Badge, Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/format"
import type { ApiKeyView, ApiScope } from "@/lib/types"

const SCOPES: { scope: ApiScope; label: string }[] = [
  { scope: "read:nonconformities", label: "No conformidades" },
  { scope: "read:indicators", label: "Indicadores" },
  { scope: "read:risks", label: "Riesgos" },
  { scope: "read:audits", label: "Auditorías" },
  { scope: "read:pqrs", label: "PQRS" },
]
const scopeLabel = (s: ApiScope) => SCOPES.find((x) => x.scope === s)?.label ?? s
const field = "flex flex-col gap-1.5"

export function ApiKeysPanel({ keys }: { keys: ApiKeyView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-small text-texto-sec">Claves de solo lectura para integrar tus datos. Guarda el token al crearlo: no se vuelve a mostrar.</p>
        <NewApiKeySheet />
      </div>
      {keys.length === 0 ? (
        <Card><EmptyState icon={KeyRoundIcon} title="Aún no hay claves de API." description="Crea la primera para integrar tus datos." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {keys.map((k) => (
              <li key={k.id} className={`flex flex-wrap items-start justify-between gap-2 p-4 ${k.revokedAt ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body text-texto">{k.name}</p>
                    <span className="font-mono text-caption text-texto-sec">{k.keyPrefix}</span>
                    {k.revokedAt && <Badge tone="neutro">Revocada</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {k.scopes.map((s) => <Chip key={s}>{scopeLabel(s)}</Chip>)}
                  </div>
                  <p className="mt-1 text-caption text-texto-sec">
                    creada {formatDate(k.createdAt)}{k.lastUsedAt ? ` · último uso ${formatDate(k.lastUsedAt)}` : " · sin uso"}
                  </p>
                </div>
                {!k.revokedAt && <RevokeButton id={k.id} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function RevokeButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("La clave dejará de funcionar de inmediato. ¿Continuar?")) return
    start(async () => {
      const r = await revokeApiKey(id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Clave revocada."); router.refresh()
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}>Revocar</Button>
}

function NewApiKeySheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>([])
  const [token, setToken] = useState<string | null>(null)

  function toggle(s: ApiScope) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }
  function submit() {
    if (name.trim().length < 1) { toast.error("Ponle un nombre a la clave."); return }
    if (scopes.length === 0) { toast.error("Elige al menos un permiso."); return }
    start(async () => {
      const r = await createApiKey({ name, scopes })
      if (!r.ok) { toast.error(r.error); return }
      setToken(r.data.token)
      router.refresh()
    })
  }
  function close(v: boolean) {
    setOpen(v)
    if (!v) { setName(""); setScopes([]); setToken(null) }
  }
  function copy() {
    if (token) navigator.clipboard?.writeText(token).then(() => toast.success("Token copiado."), () => toast.error("No se pudo copiar."))
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Nueva clave</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva clave de API</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {token ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md bg-advertencia-suave p-3 text-small text-advertencia-texto">
                Guarda este token ahora: <strong>no se vuelve a mostrar</strong>.
              </div>
              <div className="flex items-center gap-2 rounded-md border border-borde bg-superficie-alt p-2">
                <code className="min-w-0 flex-1 break-all font-mono text-caption text-texto" aria-label="Token de API">{token}</code>
                <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar token"><CopyIcon /></Button>
              </div>
            </div>
          ) : (
            <>
              <div className={field}><Label htmlFor="ak-name">Nombre</Label>
                <Input id="ak-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Integración BI" />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-small font-medium text-texto">Permisos (solo lectura)</legend>
                {SCOPES.map((s) => (
                  <label key={s.scope} className="flex items-center gap-2 text-body text-texto">
                    <input type="checkbox" checked={scopes.includes(s.scope)} onChange={() => toggle(s.scope)} className="accent-acento" />
                    {s.label}
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>
        <SheetFooter className="border-t border-borde">
          {token ? <Button onClick={() => close(false)}>Listo</Button> : <Button onClick={submit} loading={pending}>Crear</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
