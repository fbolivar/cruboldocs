"use client"

import { MultiSelect } from "@/components/documentos/multi-select"
import { FIELD_IDS, type FieldKey, type RegisterForm } from "@/components/documentos/use-register-form"
import { Field, FormSection } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type PositionKey = Extract<FieldKey, "elaborador" | "revisor" | "aprobador">

const POSITION_FIELDS: { key: PositionKey; label: string; placeholder: string }[] = [
  { key: "elaborador", label: "Cargo que elabora", placeholder: "Elige el cargo que elabora" },
  { key: "revisor", label: "Cargo que revisa", placeholder: "Elige el cargo que revisa" },
  { key: "aprobador", label: "Cargo que aprueba", placeholder: "Elige el cargo que aprueba" },
]

/** Sección 2: cargos con segregación de funciones, distribución y confirmación de lectura. */
export function RegisterResponsables({ form }: { form: RegisterForm }) {
  const { values, update, touch, errorFor, catalogs } = form
  const options = catalogs.positions.map((p) => ({ value: p.id, label: p.name }))

  return (
    <FormSection title="2 · Responsables">
      {POSITION_FIELDS.map(({ key, label, placeholder }) => (
        <Field
          key={key}
          id={FIELD_IDS[key]}
          label={label}
          required
          help={key === "aprobador" && !errorFor(key) ? "El revisor y el aprobador deben ser cargos distintos al elaborador." : undefined}
          error={errorFor(key)}
        >
          {(aria) => (
            <Select value={values[key]} onValueChange={(v) => update(key, v)} onOpenChange={(o) => !o && touch(key)}>
              <SelectTrigger {...aria} className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent position="popper">
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      ))}

      <Field id="reg-distribucion" label="Cargos de distribución" help="Quiénes recibirán el documento cuando esté vigente.">
        {(aria) => (
          <MultiSelect
            {...aria}
            options={options}
            value={values.distribution}
            onChange={(v) => update("distribution", v)}
            placeholder="Elige uno o varios cargos"
            searchable
            className="w-full"
          />
        )}
      </Field>

      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="reg-lectura" className="text-label">
            Requiere confirmar lectura
          </Label>
          <p id="reg-lectura-ayuda" className="text-small text-texto-sec">
            Cada cargo de distribución deberá confirmar que lo leyó.
          </p>
        </div>
        <Switch
          id="reg-lectura"
          checked={values.readRequired}
          onCheckedChange={(c) => update("readRequired", c)}
          aria-describedby="reg-lectura-ayuda"
        />
      </div>
    </FormSection>
  )
}
