import "server-only"

import nodemailer from "nodemailer"

import { TASK_META } from "@/lib/domain/tasks"
import { formatDate } from "@/lib/format"
import { createAdminClient } from "@/lib/supabase/server"
import type { TaskType } from "@/lib/types"

// Envío de la cola email_outbox por SMTP propio (ADR-003). Se llama después de cada
// mutación que puede encolar correos (vía `after`) y en el cron diario como respaldo.

const MAX_ATTEMPTS = 5
const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

interface Mail {
  subject: string
  text: string
  html: string
}

function layout(title: string, lines: string[], cta: { label: string; href: string }): Mail["html"] {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F8FAFB;font-family:Arial,sans-serif;color:#12232B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:24px">
<tr><td style="font-size:14px;color:#5C6F7A;padding-bottom:8px">CrubolDocs</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px">${esc(title)}</td></tr>
${lines.map((l) => `<tr><td style="font-size:15px;line-height:22px;padding-bottom:8px">${l}</td></tr>`).join("")}
<tr><td style="padding-top:16px"><a href="${esc(cta.href)}" style="display:inline-block;background:#0B7285;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">${esc(cta.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#5C6F7A;padding-top:24px">Recibes este correo porque tienes una cuenta en CrubolDocs. No respondas a este mensaje.</td></tr>
</table></td></tr></table></body></html>`
}

export function render(template: string, p: Record<string, unknown>): Mail | null {
  if (template === "contrasena_cambiada") {
    // Aviso de seguridad: la contraseña de la cuenta cambió. Si no fue el titular, puede
    // recuperar la cuenta de inmediato. No lleva datos sensibles ni la nueva contraseña.
    const cuando = p.cuando ? String(p.cuando) : ""
    const href = `${APP_URL()}/recuperar`
    return {
      subject: "Tu contraseña de CrubolDocs fue cambiada",
      text: `La contraseña de tu cuenta de CrubolDocs se cambió${cuando ? ` el ${cuando}` : ""}.\n\nSi fuiste tú, ignora este mensaje.\nSi NO reconoces este cambio, recupera tu cuenta de inmediato y avisa al administrador de tu organización: ${href}`,
      html: layout(
        "Tu contraseña fue cambiada",
        [
          `La contraseña de tu cuenta de CrubolDocs se cambió${cuando ? ` el <strong>${esc(cuando)}</strong>` : ""}.`,
          "Si fuiste tú, no tienes que hacer nada.",
          "Si <strong>no</strong> reconoces este cambio, recupera tu cuenta de inmediato y avisa al administrador de tu organización.",
        ],
        { label: "Recuperar mi cuenta", href }
      ),
    }
  }
  if (template === "tarea_nueva") {
    const label = TASK_META[p.tipo as TaskType]?.label ?? "Nueva tarea"
    const what = [p.codigo, p.titulo].filter(Boolean).join(" · ") + (p.version ? ` (v${p.version})` : "")
    const due = p.vence ? formatDate(String(p.vence)) : null
    const href = `${APP_URL()}/app`
    return {
      subject: `${label}: ${what}`,
      text: `Tienes una tarea nueva en CrubolDocs.\n\n${label}: ${what}\n${due ? `Vence: ${due}\n` : ""}\nAbre tu bandeja: ${href}`,
      html: layout(`${label}`, [esc(what), due ? `Vence el <strong>${esc(due)}</strong>.` : ""].filter(Boolean), {
        label: "Abrir mi bandeja",
        href,
      }),
    }
  }
  if (template === "invitacion") {
    const href = String(p.enlace)
    const due = p.vence ? formatDate(String(p.vence)) : null
    return {
      subject: `Te invitaron a ${p.organizacion} en CrubolDocs`,
      text: `Te invitaron a unirte a ${p.organizacion} en CrubolDocs con el cargo ${p.cargo}.\n\nCrea tu cuenta aquí: ${href}\n${due ? `El enlace vence el ${due}.` : ""}`,
      html: layout(
        `Te invitaron a ${p.organizacion}`,
        [
          `Tendrás el cargo <strong>${esc(p.cargo)}</strong>.`,
          due ? `El enlace vence el ${esc(due)}. Si no esperabas esta invitación, ignora este correo.` : "",
        ].filter(Boolean),
        { label: "Crear mi cuenta", href }
      ),
    }
  }
  return null
}

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

/** Envía los correos pendientes. Cada fila se reclama incrementando `attempts` (evita envíos dobles). */
export async function flushOutbox(limit = 50): Promise<{ sent: number; failed: number }> {
  if (!smtpConfigured()) return { sent: 0, failed: 0 }
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from("email_outbox")
    .select("id, to_email, template, payload, attempts")
    .eq("status", "pendiente")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(limit)
  if (!rows?.length) return { sent: 0, failed: 0 }

  const port = Number(process.env.SMTP_PORT ?? 465)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  let sent = 0
  let failed = 0
  for (const row of rows) {
    const { data: claimed } = await admin
      .from("email_outbox")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("attempts", row.attempts)
      .eq("status", "pendiente")
      .select("id")
    if (!claimed?.length) continue

    const mail = render(row.template, (row.payload ?? {}) as Record<string, unknown>)
    try {
      if (!mail) throw new Error(`Plantilla desconocida: ${row.template}`)
      await transport.sendMail({ from, to: row.to_email, ...mail })
      await admin.from("email_outbox").update({ status: "enviado", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id)
      sent++
    } catch (e) {
      const last = row.attempts + 1 >= MAX_ATTEMPTS
      await admin
        .from("email_outbox")
        .update({ status: last ? "fallido" : "pendiente", last_error: String(e instanceof Error ? e.message : e).slice(0, 500) })
        .eq("id", row.id)
      failed++
    }
  }
  return { sent, failed }
}
