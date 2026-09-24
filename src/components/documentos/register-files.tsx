"use client"

import { FileDropzone } from "@/components/documentos/file-dropzone"
import { FIELD_IDS, type RegisterForm } from "@/components/documentos/use-register-form"
import { Field, FormSection } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/** Sección 3: PDF de consulta + archivo fuente (obligatorios), periodicidad de revisión y resumen del cambio. */
export function RegisterFiles({ form }: { form: RegisterForm }) {
  const { values, update, updateFile, touch, errorFor } = form

  return (
    <FormSection title="3 · Archivos y revisión">
      <FileDropzone
        id={FIELD_IDS.pdf}
        label="PDF de consulta"
        extensions={[".pdf"]}
        formatsText="Solo PDF"
        typeError="Solo se aceptan PDF para la versión de consulta."
        sizeError="El archivo supera 25 MB. Comprime el PDF o divide el documento."
        value={values.pdf}
        onChange={(fn) => updateFile("pdf", fn)}
        onTouched={() => touch("pdf")}
        error={errorFor("pdf")}
      />
      <FileDropzone
        id={FIELD_IDS.source}
        label="Archivo fuente"
        extensions={[".docx", ".doc", ".xlsx", ".xls"]}
        formatsText="Word o Excel (.docx, .xlsx)"
        typeError="El archivo fuente debe ser Word o Excel (.docx, .doc, .xlsx, .xls)."
        sizeError="El archivo supera 25 MB. Divide el documento o reduce su tamaño."
        value={values.source}
        onChange={(fn) => updateFile("source", fn)}
        onTouched={() => touch("source")}
        error={errorFor("source")}
      />

      <Field id={FIELD_IDS.reviewMonths} label="Revisar cada (meses)" required error={errorFor("reviewMonths")}>
        {(aria) => (
          <Input
            {...aria}
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={values.reviewMonths}
            onChange={(e) => update("reviewMonths", e.target.value)}
            onBlur={() => touch("reviewMonths")}
            className="w-30"
          />
        )}
      </Field>

      <Field id={FIELD_IDS.changeSummary} label="Resumen del cambio" required error={errorFor("changeSummary")}>
        {(aria) => (
          <Textarea
            {...aria}
            value={values.changeSummary}
            onChange={(e) => update("changeSummary", e.target.value)}
            onBlur={() => touch("changeSummary")}
            placeholder="Por ejemplo: Versión inicial del procedimiento."
            rows={3}
            maxLength={500}
          />
        )}
      </Field>
    </FormSection>
  )
}
