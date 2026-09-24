"use client"

import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { RiskLevelBadge } from "@/components/riesgos/risk-level-badge"
import { IMPACT_LABELS, PROBABILITY_LABELS, riskLevel, riskScore } from "@/lib/domain/risk"
import { cn } from "@/lib/utils"

function Scale({
  id,
  label,
  names,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  names: readonly string[]
  value: number | null
  error?: string | null
  onChange: (v: number) => void
}) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-label">
        {label}
        {value && <span className="font-normal text-texto-sec"> · {names[value - 1]}</span>}
      </span>
      <RadioGroupPrimitive.Root
        aria-labelledby={`${id}-label`}
        aria-describedby={errorId}
        aria-required
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(Number(v))}
        className="grid grid-cols-5 gap-1"
      >
        {names.map((name, idx) => (
          <RadioGroupPrimitive.Item
            key={name}
            value={String(idx + 1)}
            aria-label={`${idx + 1} · ${name}`}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm border px-1 py-1.5 transition-colors duration-150",
              "border-borde-fuerte bg-superficie text-texto hover:bg-superficie-alt",
              "data-checked:border-acento data-checked:bg-acento-suave data-checked:text-acento",
              error && "border-error"
            )}
          >
            <span className="font-display text-h3">{idx + 1}</span>
            <span className="hidden text-caption sm:block">{name}</span>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {error && (
        <p id={errorId} className="text-small text-error-texto">
          {error}
        </p>
      )}
    </div>
  )
}

interface PickerProps {
  idPrefix: string
  probability: number | null
  impact: number | null
  onChange: (next: { probability: number | null; impact: number | null }) => void
  errors?: { probability?: string | null; impact?: string | null }
}

/** Selector de probabilidad e impacto (1–5, con nombre) y vista previa en vivo del nivel resultante. */
export function ProbabilityImpactPicker({ idPrefix, probability, impact, onChange, errors }: PickerProps) {
  const score = probability && impact ? riskScore(probability, impact) : null
  return (
    <div className="flex flex-col gap-4">
      <Scale
        id={`${idPrefix}-p`}
        label="Probabilidad"
        names={PROBABILITY_LABELS}
        value={probability}
        error={errors?.probability}
        onChange={(v) => onChange({ probability: v, impact })}
      />
      <Scale
        id={`${idPrefix}-i`}
        label="Impacto"
        names={IMPACT_LABELS}
        value={impact}
        error={errors?.impact}
        onChange={(v) => onChange({ probability, impact: v })}
      />
      <div className="flex items-center gap-2 rounded-sm bg-superficie-alt px-3 py-2 text-small" aria-live="polite">
        <span className="text-texto-sec">Nivel resultante:</span>
        {score ? (
          <RiskLevelBadge level={riskLevel(score)} score={score} />
        ) : (
          <span className="text-texto-sec">elige probabilidad e impacto</span>
        )}
      </div>
    </div>
  )
}
