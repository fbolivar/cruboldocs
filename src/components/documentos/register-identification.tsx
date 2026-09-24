"use client"

import { FIELD_IDS, type RegisterForm } from "@/components/documentos/use-register-form"
import { Field, FormSection } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Sección 1: proceso, tipo, título y código sugerido TIPO-PROC-NNN (editable, único). */
export function RegisterIdentification({ form }: { form: RegisterForm }) {
  const { values, update, touch, errorFor, catalogs } = form

  return (
    <FormSection title="1 · Identificación">
      <Field id={FIELD_IDS.processId} label="Proceso" required error={errorFor("processId")}>
        {(aria) => (
          <Select
            value={values.processId}
            onValueChange={(v) => update("processId", v)}
            onOpenChange={(o) => !o && touch("processId")}
          >
            <SelectTrigger {...aria} className="w-full">
              <SelectValue placeholder="Elige el proceso" />
            </SelectTrigger>
            <SelectContent position="popper">
              {catalogs.processes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field id={FIELD_IDS.typeId} label="Tipo" required error={errorFor("typeId")}>
        {(aria) => (
          <Select value={values.typeId} onValueChange={(v) => update("typeId", v)} onOpenChange={(o) => !o && touch("typeId")}>
            <SelectTrigger {...aria} className="w-full">
              <SelectValue placeholder="Elige el tipo de documento" />
            </SelectTrigger>
            <SelectContent position="popper">
              {catalogs.types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field id={FIELD_IDS.title} label="Título" required error={errorFor("title")}>
        {(aria) => (
          <Input
            {...aria}
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            onBlur={() => touch("title")}
            placeholder="Por ejemplo: Gestión del cambio"
            maxLength={160}
          />
        )}
      </Field>

      <Field
        id={FIELD_IDS.code}
        label="Código"
        required
        help="Sugerido según tipo y proceso. Puedes editarlo."
        error={errorFor("code")}
      >
        {(aria) => (
          <Input
            {...aria}
            value={values.code}
            onChange={(e) => update("code", e.target.value.toUpperCase())}
            onBlur={() => touch("code")}
            placeholder="TIPO-PROC-NNN"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
    </FormSection>
  )
}
