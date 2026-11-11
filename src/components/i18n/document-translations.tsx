"use client"

import { LanguagesIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setContentTranslation } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDict } from "@/lib/i18n/provider"

/** Editar la versión en inglés del título de un documento (v1.4-4). */
export function DocumentTranslations({ entityId, original, titleEn }: { entityId: string; original: string; titleEn: string }) {
  const router = useRouter()
  const dict = useDict()
  const [pending, start] = useTransition()
  const [value, setValue] = useState(titleEn)

  function save(next: string, cleared = false) {
    start(async () => {
      const r = await setContentTranslation({ entityType: "documento", entityId, locale: "en", field: "title", value: next })
      if (!r.ok) { toast.error(r.error); return }
      setValue(next)
      toast.success(cleared ? dict.translations.removed : dict.translations.saved)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <LanguagesIcon className="size-4 text-texto-sec" aria-hidden="true" />
        <CardTitle>{dict.translations.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-texto-sec">{dict.translations.original} ({dict.settings.spanish})</span>
          <span className="text-body text-texto">{original}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tr-title">{dict.translations.englishVersion} · {dict.translations.fieldTitle}</Label>
          <Input id="tr-title" value={value} maxLength={200} onChange={(e) => setValue(e.target.value)} placeholder="English title" />
          <p className="text-caption text-texto-sec">{dict.translations.emptyHint}</p>
        </div>
        <div className="flex gap-2">
          <Button loading={pending} onClick={() => save(value.trim())} disabled={value.trim() === titleEn.trim()}>
            {dict.common.save}
          </Button>
          {titleEn && (
            <Button variant="outline" loading={pending} onClick={() => save("", true)}>
              {dict.common.remove}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
